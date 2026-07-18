const request = require('supertest');

jest.mock('../../src/config/minio', () => ({
  minioClient: {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(true),
    putObject: jest.fn().mockResolvedValue(true),
    removeObject: jest.fn().mockResolvedValue(true),
    presignedGetObject: jest.fn().mockResolvedValue('http://mock/url')
  }
}));

const app = require('../../src/app');
const knex = require('../../src/config/knex');
const masterImportService = require('../../src/services/internalMonitoringMasterImportService');
const frequencyService = require('../../src/services/internalMonitoringFrequencyService');
const crypto = require('crypto');

describe('Internal Monitoring - Master Execution Engine', () => {
  let adminId;
  let canonicalJson;
  let sourceHash;
  let versionId;

  beforeAll(async () => {
    await knex.raw('TRUNCATE TABLE monitoring_target_relations, monitoring_event_targets, monitoring_events, monitoring_target_parameter_values, monitoring_requirement_criteria, monitoring_evidence_requirement_templates, monitoring_item_regulations, monitoring_item_parameters, monitoring_item_criteria, monitoring_source_criteria, monitoring_source_assessments, monitoring_targets, monitoring_item_assignments, monitoring_items, monitoring_master_versions, users RESTART IDENTITY CASCADE');

    const [admin] = await knex('users').insert({ username: 'admin', role: 'ADMIN_PT', password_hash: 'hash', is_active: true }).returning('id');
    adminId = admin.id;

    // Generate valid 295 checklists
    const items = [];
    for (let i = 1; i <= 295; i++) {
      items.push({
        itemCode: `CHK-${String(i).padStart(3, '0')}`,
        title: `Title ${i}`,
        dutyCluster: 'CLUSTER',
        normalizationType: 'TYPE',
        frequencyType: i % 2 === 0 ? 'MONTHLY' : 'QUARTERLY',
        frequencyConfig: i % 2 === 0 ? { dueDay: 5 } : { dueDay: 10 },
        assignments: [
          { positionCode: 'COLLECTOR', capability: 'COLLECTOR' },
          { positionCode: 'APPROVER', capability: 'APPROVER' },
          { positionCode: 'VERIFIER', capability: 'VERIFIER' }
        ],
        criteria: [{ assessment: 'PMPZI', criterionCode: `C${i}` }],
        parameters: [{ parameterCode: 'PARAM1', label: 'Score', dataType: 'INTEGER' }],
        requirements: [{ requirementCode: 'REQ1', label: 'File', type: 'FILE', required: true }],
        regulations: [{ code: 'REG1', title: 'Reg Title' }]
      });
    }

    canonicalJson = {
      masterVersion: '2026.1',
      effectiveFrom: '2026-01-01',
      items
    };
    sourceHash = crypto.createHash('sha256').update(JSON.stringify(canonicalJson)).digest('hex');
    
    await knex('monitoring_periods').insert({ id: 991, year: 2026, month: 7, name: 'Jul 2026', status: 'OPEN', start_date: '2026-07-01', end_date: '2026-07-31' }).onConflict('id').ignore();
    await knex('internal_units').insert({ id: 991, code: 'UNIT_991', name: 'Unit Test' }).onConflict('id').ignore();
    await knex('internal_units').insert({ id: 1, code: 'UNIT_1', name: 'Unit 1' }).onConflict('id').ignore();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  it('rejects import if missing checklists', async () => {
    const invalidJson = { ...canonicalJson, items: canonicalJson.items.slice(0, 50) }; // Only 50 items

    try {
      await masterImportService.previewImport(adminId, invalidJson);
      // Fail if doesn't throw
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toMatch(/Expected exactly 295 items/);
    }
  });

  it('previews import successfully', async () => {
    const result = await masterImportService.previewImport(adminId, canonicalJson);
    expect(result.isValid).toBe(true);
    expect(result.report.expectedItems).toBe(295);
    expect(result.report.importedItems).toBe(295);
  });

  it('commits import transactionally', async () => {
    versionId = await masterImportService.commitImport(adminId, canonicalJson, sourceHash);
    expect(versionId).toBeDefined();

    const items = await knex('monitoring_items').where('master_version_id', versionId);
    expect(items.length).toBe(295);

    const params = await knex('monitoring_item_parameters');
    expect(params.length).toBe(295);
  });

  it('activates master version', async () => {
    const activated = await masterImportService.activateMasterVersion(adminId, versionId);
    expect(activated).toBe(true);

    const version = await knex('monitoring_master_versions').where('id', versionId).first();
    expect(version.status).toBe('ACTIVE');
  });

  it('generates targets using frequency strategies', async () => {
    // Generate targets for CHK-001 and CHK-002
    const targetIds = await frequencyService.generateTargets(991, ['CHK-001', 'CHK-002'], adminId);
    
    expect(targetIds.length).toBe(2);

    const targets = await knex('monitoring_targets').whereIn('id', targetIds);
    expect(targets.length).toBe(2);

    // Verify requirements instantiated
    const params = await knex('monitoring_target_parameter_values').whereIn('monitoring_target_id', targetIds);
    expect(params.length).toBe(2);
  });

  it('generates events and corresponding event targets', async () => {
    const [eventId] = await knex('monitoring_events').insert({
      event_type: 'EV-001',
      title: 'Incident X',
      description: 'Desc',
      event_date: new Date(),
      internal_unit_id: 991,
      created_by: adminId
    }).returning('id');

    // Manually push an item to EVENT_WITH_MONTHLY_RECAP for testing this logic
    await knex('monitoring_items').where('item_code', 'CHK-003').update({ frequency_type: 'EVENT_WITH_MONTHLY_RECAP' });

    const eventTargetIds = await frequencyService.generateEventTargets(eventId.id || eventId, adminId);
    // The event strategy currently just generates a target 
    expect(eventTargetIds.length).toBe(1);

    const targets = await knex('monitoring_targets').whereIn('id', eventTargetIds);
    expect(targets.length).toBe(1);
    expect(targets[0].natural_key).toMatch(/EVENT_WITH_MONTHLY_RECAP/);
  });

});
