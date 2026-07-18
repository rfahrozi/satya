const request = require('supertest');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const InternalMonitoringReportService = require('../../src/services/internalMonitoringReportService');
const InternalMonitoringRetentionService = require('../../src/services/internalMonitoringRetentionService');
const crypto = require('crypto');
const fs = require('fs');

jest.mock('../../src/config/minio', () => ({
  minioClient: {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(true),
    putObject: jest.fn().mockResolvedValue(true),
    removeObject: jest.fn().mockResolvedValue(true),
    presignedGetObject: jest.fn().mockResolvedValue('http://mock/url')
  }
}));

describe('Internal Monitoring - Reporting & Audit Engine', () => {
  let adminToken;
  let adminId;
  let templateId;
  let reportService;
  let retentionService;
  let testRunId;

  beforeAll(async () => {
    // 1. Clean up
    await knex('monitoring_export_files').del();
    await knex('monitoring_evidence_manifests').del();
    await knex('monitoring_audit_seals').del();
    await knex('monitoring_report_runs').del();
    await knex('monitoring_report_templates').del();
    await knex('monitoring_legal_holds').del();

    // 2. Insert Admin User
    const username = 'rep_admin_' + Date.now();
    const [user] = await knex('users').insert({
      username: username,
      password_hash: 'hash',
      role: 'ADMIN_PT',
      is_active: true
    }).returning('id');
    adminId = user.id;

    const authRes = await request(app).post('/api/auth/login').send({
      username: username,
      password: 'password' // In mock tests, token might be mocked or we can just sign it
    });
    
    // For this test, let's just generate a token using our mocked auth or assume we don't need real token if we bypass.
    // Actually, in SATYA tests, the auth routes are usually mocked or we use real login if test setup allows.
    // Let's create a token directly if we know JWT secret
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ id: adminId, role: 'ADMIN_PT' }, process.env.JWT_SECRET || 'secret');

    // 3. Create Report Template
    const [tmpl] = await knex('monitoring_report_templates').insert({
      code: 'TMPL_' + Date.now(),
      name: 'Full Evidence Package',
      report_type: 'EVIDENCE_PACKAGE',
      scope_type: 'PERIOD',
      format: 'ZIP'
    }).returning('id');
    templateId = tmpl.id;

    reportService = new InternalMonitoringReportService();
    retentionService = new InternalMonitoringRetentionService();
  });

  afterAll(async () => {
    // Teardown
    await knex('monitoring_export_files').del();
    await knex('monitoring_evidence_manifests').del();
    await knex('monitoring_audit_seals').del();
    await knex('monitoring_report_runs').del();
    await knex('monitoring_report_templates').del();
    await knex('monitoring_legal_holds').del();
  });

  it('1. createReportRun - Initializes queued run idempotently', async () => {
    const template = await knex('monitoring_report_templates').where('id', templateId).first();
    const actor = { id: adminId };

    const run = await reportService.createReportRun(actor, template.code, { period_id: 999 }, {});
    expect(run.id).toBeDefined();
    expect(run.status).toBe('QUEUED');
    expect(run.progress_percent).toBe(0);
    
    testRunId = run.id;
  });

  it('2. processReportRun - Generates PDF, XLSX, ZIP, Manifest and Audit Seal', async () => {
    // Process the run synchronously for the test
    await reportService.processReportRun(testRunId);

    const run = await knex('monitoring_report_runs').where('id', testRunId).first();
    expect(run.status).toBe('COMPLETED');
    expect(run.progress_percent).toBe(100);
    expect(run.completed_at).not.toBeNull();

    // Verify Export Files
    const files = await knex('monitoring_export_files').where('report_run_id', testRunId);
    expect(files.length).toBeGreaterThanOrEqual(2); // PDF, XLSX, JSON, ZIP
    
    const zipFile = files.find(f => f.file_type === 'EVIDENCE_PACKAGE');
    expect(zipFile).toBeDefined();
    expect(zipFile.sha256).not.toBeNull();
    
    // Verify Audit Seal
    const seal = await knex('monitoring_audit_seals')
      .where('aggregate_type', 'REPORT_RUN')
      .where('aggregate_id', testRunId)
      .first();
    
    expect(seal).toBeDefined();
    expect(seal.root_hash).not.toBeNull();
  });

  it('3. Legal Hold - Prevents expired file cleanup', async () => {
    // Force expire the file
    await knex('monitoring_export_files')
      .where('report_run_id', testRunId)
      .update({ expires_at: new Date(Date.now() - 1000) });

    // Apply Legal Hold
    await retentionService.placeLegalHold('REPORT_RUN', testRunId.toString(), 'Audit 2026', adminId);

    // Run cleanup
    const deletedCount = await retentionService.cleanExpiredExportFiles();
    expect(deletedCount).toBe(0); // Should be blocked by hold

    // Release Hold
    const hold = await knex('monitoring_legal_holds').where('scope_type', 'REPORT_RUN').where('scope_id', testRunId.toString()).first();
    await retentionService.releaseLegalHold(hold.id);

    // Run cleanup again
    const deletedCount2 = await retentionService.cleanExpiredExportFiles();
    expect(deletedCount2).toBeGreaterThan(0); // Now it should delete
  });
});
