process.env.PT_INTERNAL_MONITORING_ENABLED = 'true';
const request = require('supertest');
const knex = require('../../src/config/knex');
jest.mock('../../src/config/minio');
const app = require('../../src/app');
const { clearDatabase, closeDatabase } = require('../setup');
const bcrypt = require('bcryptjs');

describe('Internal Monitoring - Workflow (Submit & Approve)', () => {
  let tokenCollector;
  let tokenApprover;
  let tokenOther;
  let targetId;

  beforeAll(async () => {
    await clearDatabase();
    await knex.raw('TRUNCATE TABLE monitoring_targets, monitoring_item_assignments, monitoring_items, monitoring_packages, internal_assignments, positions, internal_units, monitoring_periods, monitoring_evidences, monitoring_evidence_requirements, monitoring_target_activities RESTART IDENTITY CASCADE');

    const pwd = await bcrypt.hash('password123', 10);
    await knex('users').insert([
      { id: 901, username: 'collector', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 902, username: 'approver', password_hash: pwd, role: 'PIMPINAN', is_active: true },
      { id: 903, username: 'other', password_hash: pwd, role: 'UNIT_PIC', is_active: true }
    ]);
    
    await knex('monitoring_periods').insert({
      id: 901,
      name: 'WF Period', year: 2026, month: 7, start_date: '2026-07-01', end_date: '2026-07-31', status: 'OPEN', created_by: 902
    });

    await knex('monitoring_packages').insert({ id: 901, code: 'PKG', name: 'Pkg' });
    await knex('monitoring_items').insert({ id: 901, package_id: 901, item_code: 'WF-CHK', title: 'WF Target Dummy', frequency_type: 'MONTHLY' });
    
    const [target] = await knex('monitoring_targets').insert({
      natural_key: 'NK_WF_1',
      period_id: 901,
      monitoring_item_id: 901,
      workflow_status: 'NOT_STARTED',
      lock_version: 1,
      due_date: '2026-07-31T00:00:00Z'
    }).returning('id');
    targetId = target.id || target;

    await knex('monitoring_target_assignees').insert([
      { monitoring_target_id: targetId, user_id: 901, capability: 'COLLECTOR' },
      { monitoring_target_id: targetId, user_id: 902, capability: 'APPROVER' }
    ]);

    await knex('monitoring_evidence_requirements').insert({
      id: 901,
      monitoring_item_id: 901,
      code: 'REQ_TEXT',
      label: 'Upload Text',
      evidence_type: 'TEXT',
      is_required: true
    });

    const resCol = await request(app).post('/api/v1/auth/login').send({ username: 'collector', password: 'password123' });
    tokenCollector = resCol.body.data.token;
    
    const resApp = await request(app).post('/api/v1/auth/login').send({ username: 'approver', password: 'password123' });
    tokenApprover = resApp.body.data.token;
    
    const resOth = await request(app).post('/api/v1/auth/login').send({ username: 'other', password: 'password123' });
    tokenOther = resOth.body.data.token;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('1. saveDraft mengubah status menjadi IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/v1/internal-monitoring/targets/${targetId}/draft`)
      .set('Authorization', `Bearer ${tokenCollector}`);
      
    expect(res.status).toBe(200);
    const target = await knex('monitoring_targets').where({ id: targetId }).first();
    expect(target.workflow_status).toBe('IN_PROGRESS');
    expect(target.lock_version).toBe(2);
  });

  it('2. submitTarget ditolak karena evidence belum lengkap (400)', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/submit`)
      .set('Authorization', `Bearer ${tokenCollector}`);
      
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Bukti wajib belum lengkap/);
  });

  it('3. submitTarget berhasil setelah evidence lengkap', async () => {
    const evRes = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/evidence`)
      .set('Authorization', `Bearer ${tokenCollector}`)
      .send({ requirement_id: 901, evidence_type: 'TEXT', value_text: 'Done' });
    
    if (evRes.status !== 201) console.log('EV ERROR:', evRes.body);

    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/submit`)
      .set('Authorization', `Bearer ${tokenCollector}`);
      
    if (res.status !== 200) console.log('SUBMIT ERROR:', res.body);
    expect(res.status).toBe(200);
    const target = await knex('monitoring_targets').where({ id: targetId }).first();
    expect(target.workflow_status).toBe('AWAITING_APPROVAL');
    expect(target.lock_version).toBe(3); // 2 -> submit(3)
  });

  it('4. approveTarget ditolak jika dilakukan oleh bukan approver (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/approve`)
      .set('Authorization', `Bearer ${tokenOther}`);
      
    expect(res.status).toBe(403);
  });

  it('5. approveTarget ditolak karena SOD violation (Collector tidak boleh Approve) (403)', async () => {
    // Modify assignee to give collector approver capability for this test case
    await knex('monitoring_target_assignees').insert({ monitoring_target_id: targetId, user_id: 901, capability: 'APPROVER' });

    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/approve`)
      .set('Authorization', `Bearer ${tokenCollector}`);
      
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/SOD Violation/);
    
    // Clean up
    await knex('monitoring_target_assignees').where({ monitoring_target_id: targetId, user_id: 901, capability: 'APPROVER' }).del();
  });

  it('6. approveTarget berhasil jika dilakukan oleh approver yang sah', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/approve`)
      .set('Authorization', `Bearer ${tokenApprover}`);
      
    expect(res.status).toBe(200);
    const target = await knex('monitoring_targets').where({ id: targetId }).first();
    expect(target.workflow_status).toBe('AWAITING_VERIFICATION');
    expect(target.lock_version).toBe(4);
  });
});
