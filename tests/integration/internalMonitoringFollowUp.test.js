process.env.PT_INTERNAL_MONITORING_ENABLED = 'true';
const request = require('supertest');
const knex = require('../../src/config/knex');
jest.mock('../../src/config/minio');
const app = require('../../src/app');
const bcrypt = require('bcryptjs');

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

describe('Internal Monitoring - Follow Up Lifecycle', () => {
  let tokenVerifier;
  let tokenOwner;
  let tokenOther;
  let targetId;
  let followUpId;

  beforeAll(async () => {
    await clearDatabase();

    const pwd = await bcrypt.hash('password123', 10);
    await knex('users').insert([
      { id: 901, username: 'verifier', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 902, username: 'owner', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 903, username: 'other', password_hash: pwd, role: 'UNIT_PIC', is_active: true }
    ]);
    
    await knex('monitoring_periods').insert({
      id: 901,
      name: 'FU Period', year: 2026, month: 7, start_date: '2026-07-01', end_date: '2026-07-31', status: 'OPEN', created_by: 901
    });

    await knex('monitoring_packages').insert({ id: 901, code: 'PKG', name: 'Pkg' });
    await knex('monitoring_items').insert({ id: 901, package_id: 901, item_code: 'FU-CHK', title: 'FU Target Dummy', frequency_type: 'MONTHLY' });
    
    const [target] = await knex('monitoring_targets').insert({
      natural_key: 'NK_FU_1',
      period_id: 901,
      monitoring_item_id: 901,
      workflow_status: 'VERIFIED',
      lock_version: 1,
      due_date: '2026-07-31T00:00:00Z'
    }).returning('id');
    targetId = target.id || target;

    await knex('monitoring_target_assignees').insert([
      { monitoring_target_id: targetId, user_id: 901, capability: 'VERIFIER' },
      { monitoring_target_id: targetId, user_id: 902, capability: 'COLLECTOR' }
    ]);

    const resVer = await request(app).post('/api/v1/auth/login').send({ username: 'verifier', password: 'password123' });
    tokenVerifier = resVer.body.data.token;
    
    const resOwn = await request(app).post('/api/v1/auth/login').send({ username: 'owner', password: 'password123' });
    tokenOwner = resOwn.body.data.token;
    
    const resOth = await request(app).post('/api/v1/auth/login').send({ username: 'other', password: 'password123' });
    tokenOther = resOth.body.data.token;
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  it('1. createFollowUp berhasil dilakukan oleh Verifier', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/follow-ups`)
      .set('Authorization', `Bearer ${tokenVerifier}`)
      .send({
        title: 'Perbaiki Dokumen Y',
        description: 'Tolong direvisi bagian 2',
        due_at: '2026-08-15T00:00:00Z',
        owner_user_id: 902
      });

    if (res.status !== 201) console.log('FU 1 ERROR:', res.body);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('OPEN');
    followUpId = res.body.data.id;
  });

  it('2. createFollowUp ditolak jika dilakukan oleh bukan Verifier', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/follow-ups`)
      .set('Authorization', `Bearer ${tokenOther}`)
      .send({
        title: 'Harusnya Gagal',
        due_at: '2026-08-15T00:00:00Z',
        owner_user_id: 902
      });

    expect(res.status).toBe(403);
  });

  it('3. startFollowUp berhasil dilakukan oleh owner', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/follow-ups/${followUpId}/start`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    if (res.status !== 200) console.log('FU 3 ERROR:', res.body);
    expect(res.status).toBe(200);
    const fu = await knex('monitoring_follow_ups').where({ id: followUpId }).first();
    expect(fu.status).toBe('IN_PROGRESS');
  });

  it('4. submitFollowUpResolution berhasil dilakukan oleh owner', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/follow-ups/${followUpId}/submit-resolution`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ resolution_note: 'Sudah diperbaiki semua' });

    if (res.status !== 200) console.log('FU 4 ERROR:', res.body);
    expect(res.status).toBe(200);
    const fu = await knex('monitoring_follow_ups').where({ id: followUpId }).first();
    expect(fu.status).toBe('AWAITING_VERIFICATION');
    expect(fu.resolution_note).toBe('Sudah diperbaiki semua');
  });

  it('5. closeFollowUp berhasil dilakukan oleh Verifier', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/follow-ups/${followUpId}/close`)
      .set('Authorization', `Bearer ${tokenVerifier}`);

    if (res.status !== 200) console.log('FU 5 ERROR:', res.body);
    expect(res.status).toBe(200);
    const fu = await knex('monitoring_follow_ups').where({ id: followUpId }).first();
    expect(fu.status).toBe('CLOSED');
    expect(fu.closed_at).not.toBeNull();
  });

  it('6. reopenFollowUp ditolak jika status sudah CLOSED', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/follow-ups/${followUpId}/reopen`)
      .set('Authorization', `Bearer ${tokenVerifier}`);

    expect(res.status).toBe(400); 
  });
});
