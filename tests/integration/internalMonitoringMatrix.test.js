const request = require('supertest');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const { instantiateTargetCriteria } = require('../../src/services/internalMonitoringCriterionService');
const coverageService = require('../../src/services/internalMonitoringCoverageService');
const assessmentService = require('../../src/services/internalMonitoringAssessmentService');
const verificationService = require('../../src/services/internalMonitoringVerificationService');

jest.mock('../../src/config/minio', () => ({
  minioClient: {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(true),
    putObject: jest.fn().mockResolvedValue(true),
    removeObject: jest.fn().mockResolvedValue(true),
    presignedGetObject: jest.fn().mockResolvedValue('http://mock/url')
  }
}));

describe('Internal Monitoring - Matrix & Verification Engine', () => {
  let actor;
  let targetId;
  let criterionId1;
  let criterionId2;

  beforeAll(async () => {
    // 1. Setup User
    const username = 'verifier_' + Date.now();
    const [user] = await knex('users').insert({
      username: username,
      password_hash: 'hash',
      role: 'VERIFIER',
      is_active: true
    }).returning('id');
    actor = { id: user.id || user };

    // 2a. Setup Package
    const [pkg] = await knex('monitoring_packages').insert({
      code: 'PKG-MTX-' + Date.now(),
      name: 'Matrix Test Package'
    }).returning('id');

    // 2b. Setup period and item
    const [period] = await knex('monitoring_periods').insert({
      name: 'Test Period Matrix',
      year: 2026,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      status: 'OPEN'
    }).returning('id');

    const [item] = await knex('monitoring_items').insert({
      item_code: 'CHK-MTX-' + Date.now(),
      title: 'Matrix Test Item',
      package_id: pkg.id || pkg,
      frequency_type: 'MONTHLY',
      is_active: true
    }).returning('id');

    // 3. Source Criteria & Requirement Template
    const sc1code = 'SC1-' + Date.now();
    const sc2code = 'SC2-' + Date.now();

    const [sc1] = await knex('monitoring_source_criteria').insert({
      criterion_code: sc1code,
      criterion_text: 'Must have X'
    }).returning('id');
    const [sc2] = await knex('monitoring_source_criteria').insert({
      criterion_code: sc2code,
      criterion_text: 'Must have Y'
    }).returning('id');

    await knex('monitoring_item_criteria').insert([
      { monitoring_item_id: item.id || item, source_criterion_id: sc1.id || sc1, is_primary: true },
      { monitoring_item_id: item.id || item, source_criterion_id: sc2.id || sc2, is_primary: true }
    ]);

    // 4. Target Generation
    const [tId] = await knex('monitoring_targets').insert({
      period_id: period.id || period,
      monitoring_item_id: item.id || item,
      natural_key: 'NK-MTX-' + Date.now(),
      status: 'AWAITING_VERIFICATION',
      due_date: new Date()
    }).returning('id');
    targetId = tId.id || tId;

    // Instantiate criteria
    const itemSnapshot = { id: item.id || item };
    await knex.transaction(async trx => {
      await instantiateTargetCriteria(targetId, itemSnapshot, trx);
    });

    const criteria = await knex('monitoring_target_criteria').where('monitoring_target_id', targetId);
    criterionId1 = criteria.find(c => c.criterion_code === sc1code).id;
    criterionId2 = criteria.find(c => c.criterion_code === sc2code).id;
  });

  afterAll(async () => {
    // Teardown
    await knex('monitoring_assessment_findings').del();
    await knex('monitoring_target_assessment_summaries').del();
    await knex('monitoring_criterion_assessments').del();
    await knex('monitoring_target_criteria').del();
    await knex('monitoring_item_criteria').del();
    await knex('monitoring_source_criteria').del();
    await knex('monitoring_targets').where('id', targetId).del();
  });

  it('1. assessCriterion - Rejects PARTIALLY_MET without review_note', async () => {
    await expect(assessmentService.assessCriterion(actor, targetId, criterionId1, {
      status: 'PARTIALLY_MET',
      review_note: '' // Empty note
    })).rejects.toThrow(/Review note is required/);
  });

  it('2. assessCriterion - Authorized Verifier can post MET', async () => {
    const assessment = await assessmentService.assessCriterion(actor, targetId, criterionId1, {
      status: 'MET'
    });
    expect(assessment.id).toBeDefined();
    expect(assessment.status).toBe('MET');
    expect(assessment.score).toBe(1.0);
  });

  it('3. Verification Gate - Blocks verification if not all required criteria assessed', async () => {
    // criterionId2 is NOT_ASSESSED yet
    await expect(verificationService.verifyTarget(actor, targetId, {})).rejects.toThrow(/Not all required criteria/);
  });

  it('4. assessCriterion - Can post NON_COMPLIANT criterion and verify target', async () => {
    await assessmentService.assessCriterion(actor, targetId, criterionId2, {
      status: 'NOT_MET',
      review_note: 'Missing Y completely'
    });

    const result = await verificationService.verifyTarget(actor, targetId, {});
    expect(result.decision).toBe('PARTIALLY_COMPLIANT'); // 1 MET (1.0), 1 NOT_MET (0.0) => 50%
  });

  it('5. Coverage Service - Weighted compliance equations', async () => {
    const summary = await knex('monitoring_target_assessment_summaries')
      .where('monitoring_target_id', targetId)
      .first();

    expect(summary.required_criterion_count).toBe(2);
    expect(summary.assessed_criterion_count).toBe(2);
    expect(summary.met_count).toBe(1);
    expect(summary.not_met_count).toBe(1);
    expect(summary.weighted_score).toBe("0.50");
    expect(summary.compliance_percentage).toBe("50.00");
  });
});
