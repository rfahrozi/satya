process.env.PT_INTERNAL_MONITORING_ENABLED = 'true';
const request = require('supertest');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const bcrypt = require('bcryptjs');
const path = require('path');
jest.mock('../../src/config/minio', () => ({}), { virtual: true });
jest.mock('../../src/emailWorker', () => ({}), { virtual: true });

async function clearDatabase() {
  await knex.raw(`
    TRUNCATE TABLE 
      monitoring_targets, 
      monitoring_item_assignments, 
      monitoring_items, 
      monitoring_packages, 
      internal_assignments, 
      positions, 
      internal_units, 
      monitoring_periods, 
      monitoring_evidences, 
      monitoring_evidence_requirements,
      monitoring_target_activities,
      monitoring_target_verifications,
      monitoring_follow_ups,
      users
    RESTART IDENTITY CASCADE
  `);
}

describe('Internal Monitoring - File Security', () => {
  let tokenCollector, tokenApprover, tokenOther;
  let targetId = 999;
  let requirementId = 999;
  let evidenceId;

  beforeAll(async () => {
    await clearDatabase();
    
    const pwd = await bcrypt.hash('password123', 10);
    // Create users
    await knex('users').insert([
      { id: 991, username: 'collector_sec', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 992, username: 'approver_sec', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 993, username: 'other_sec', password_hash: pwd, role: 'UNIT_PIC', is_active: true }
    ]);

    // Setup base data
    await knex('monitoring_periods').insert({ 
      id: 999, name: 'Sec Period', year: 2026, month: 7, start_date: '2026-07-01', end_date: '2026-07-31', status: 'OPEN', created_by: 991
    });
    await knex('monitoring_packages').insert({ id: 999, code: 'SEC', name: 'Security' });
    await knex('monitoring_items').insert({ id: 999, package_id: 999, item_code: 'SEC-1', title: 'Sec Item', frequency_type: 'MONTHLY' });
    
    await knex('monitoring_evidence_requirements').insert({
      id: 999, monitoring_item_id: 999, code: 'REQ_1', label: 'Req 1', evidence_type: 'FILE', is_required: true
    });

    await knex('monitoring_targets').insert({
      id: 999, natural_key: 'NK_SEC', period_id: 999, monitoring_item_id: 999, workflow_status: 'NOT_STARTED', lock_version: 1, due_date: '2026-07-31'
    });

    await knex('monitoring_target_assignees').insert([
      { monitoring_target_id: 999, user_id: 991, capability: 'COLLECTOR' },
      { monitoring_target_id: 999, user_id: 992, capability: 'APPROVER' }
    ]);

    const resC = await request(app).post('/api/v1/auth/login').send({ username: 'collector_sec', password: 'password123' });
    tokenCollector = resC.body.data.token;
    
    const resA = await request(app).post('/api/v1/auth/login').send({ username: 'approver_sec', password: 'password123' });
    tokenApprover = resA.body.data.token;
    
    const resO = await request(app).post('/api/v1/auth/login').send({ username: 'other_sec', password: 'password123' });
    tokenOther = resO.body.data.token;
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  it('1. Upload rejects invalid MIME type (e.g. .exe or unknown)', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/evidence/${requirementId}/file`)
      .set('Authorization', `Bearer ${tokenCollector}`)
      .attach('file', Buffer.from('mock executable data'), { filename: 'malicious.exe', contentType: 'application/x-msdownload' });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Tipe file tidak diizinkan/);
  });

  it('2. Upload accepts valid MIME type (e.g. .pdf) and creates evidence draft', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/evidence/${requirementId}/file`)
      .set('Authorization', `Bearer ${tokenCollector}`)
      .attach('file', Buffer.from('mock pdf data'), { filename: 'doc.pdf', contentType: 'application/pdf' });
      
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.evidence_type).toBe('FILE');
    
    evidenceId = res.body.data.id;
  });

  it('3. Download URL is accessible by assigned collector', async () => {
    const res = await request(app)
      .get(`/api/v1/internal-monitoring/targets/${targetId}/evidence/${evidenceId}/download`)
      .set('Authorization', `Bearer ${tokenCollector}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBeDefined();
  });

  it('4. Download URL is accessible by assigned approver', async () => {
    const res = await request(app)
      .get(`/api/v1/internal-monitoring/targets/${targetId}/evidence/${evidenceId}/download`)
      .set('Authorization', `Bearer ${tokenApprover}`);
      
    expect(res.status).toBe(200);
  });

  it('5. Download URL is FORBIDDEN for unassigned user', async () => {
    const res = await request(app)
      .get(`/api/v1/internal-monitoring/targets/${targetId}/evidence/${evidenceId}/download`)
      .set('Authorization', `Bearer ${tokenOther}`);
      
    expect(res.status).toBe(403);
  });
});
