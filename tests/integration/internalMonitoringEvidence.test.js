process.env.PT_INTERNAL_MONITORING_ENABLED = 'true';
const request = require('supertest');
const knex = require('../../src/config/knex');
jest.mock('../../src/config/minio');
const app = require('../../src/app');
const { clearDatabase, closeDatabase } = require('../setup');

describe('Internal Monitoring - Evidence', () => {
  let tokenCollector, tokenOther, targetId, requirementIdFile, requirementIdText;
  
  beforeAll(async () => {
    await clearDatabase();
    await knex.raw('TRUNCATE TABLE monitoring_targets, monitoring_item_assignments, monitoring_items, monitoring_packages, internal_assignments, positions, internal_units, monitoring_periods, monitoring_evidences, monitoring_evidence_requirements RESTART IDENTITY CASCADE');

    // Create users
    const bcrypt = require('bcryptjs');
    const pwd = await bcrypt.hash('password123', 10);
    await knex('users').insert([
      { id: 901, username: 'collector', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 902, username: 'other', password_hash: pwd, role: 'UNIT_PIC', is_active: true }
    ]);
    
    // Create base tables
    await knex('monitoring_packages').insert({ id: 901, code: 'PKG1', name: 'Pkg' });
    await knex('monitoring_items').insert({ id: 901, package_id: 901, item_code: 'ITM1', title: 'Target', frequency_type: 'MONTHLY' });
    await knex('monitoring_periods').insert({ 
      id: 901, 
      name: 'Jul', 
      status: 'OPEN', 
      created_by: 901, 
      year: 2026, 
      month: 7, 
      start_date: '2026-07-01', 
      end_date: '2026-07-31' 
    });
    
    // Create target
    const [target] = await knex('monitoring_targets').insert({
      natural_key: 'NK1',
      period_id: 901,
      monitoring_item_id: 901,
      workflow_status: 'NOT_STARTED',
      lock_version: 1,
      due_date: '2026-07-31T00:00:00Z'
    }).returning('id');
    targetId = target.id || target;

    await knex('monitoring_target_assignees').insert({
      monitoring_target_id: targetId,
      user_id: 901,
      capability: 'COLLECTOR'
    });

    // Create requirements
    const [reqFile] = await knex('monitoring_evidence_requirements').insert({
      monitoring_item_id: 901,
      code: 'REQ_FILE',
      label: 'Upload File',
      evidence_type: 'FILE',
      is_required: true
    }).returning('id');
    requirementIdFile = reqFile.id || reqFile;

    const [reqText] = await knex('monitoring_evidence_requirements').insert({
      monitoring_item_id: 901,
      code: 'REQ_TEXT',
      label: 'Upload Text',
      evidence_type: 'TEXT',
      is_required: true
    }).returning('id');
    requirementIdText = reqText.id || reqText;

    // Login
    const resCol = await request(app).post('/api/v1/auth/login').send({ username: 'collector', password: 'password123' });
    tokenCollector = resCol.body.data.token;
    
    const resOth = await request(app).post('/api/v1/auth/login').send({ username: 'other', password: 'password123' });
    tokenOther = resOth.body.data.token;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('1. User lain tidak dapat mengubah evidence (403)', async () => {
    console.log('TARGET ID:', targetId);
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/evidence`)
      .set('Authorization', `Bearer ${tokenOther}`)
      .send({ requirement_id: requirementIdText, value_text: 'Hello' });
      
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('2. Tipe evidence salah ditolak', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/evidence`)
      .set('Authorization', `Bearer ${tokenCollector}`)
      .send({ requirement_id: requirementIdText, evidence_type: 'NUMBER', value_number: 10 });
      
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Tipe evidence harus TEXT/);
  });

  it('3. Collector dapat membuat evidence draft dan state berubah ke IN_PROGRESS', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/evidence`)
      .set('Authorization', `Bearer ${tokenCollector}`)
      .send({ requirement_id: requirementIdText, evidence_type: 'TEXT', value_text: 'First draft' });
      
    if (res.status === 404) console.log('ERROR 404 BODY:', res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.version_no).toBe(1);
    expect(res.body.data.evidence_status).toBe('DRAFT');

    const target = await knex('monitoring_targets').where({ id: targetId }).first();
    expect(target.workflow_status).toBe('IN_PROGRESS');
    expect(target.lock_version).toBe(2);
  });

  it('4. Reupload membuat versi baru, dan versi lama menjadi SUPERSEDED', async () => {
    const res = await request(app)
      .post(`/api/v1/internal-monitoring/targets/${targetId}/evidence`)
      .set('Authorization', `Bearer ${tokenCollector}`)
      .send({ requirement_id: requirementIdText, evidence_type: 'TEXT', value_text: 'Second draft' });
      
    expect(res.status).toBe(201);
    expect(res.body.data.version_no).toBe(2);
    expect(res.body.data.evidence_status).toBe('DRAFT');
    
    // Cek di DB versi lama
    const versions = await knex('monitoring_evidences').where({ monitoring_target_id: targetId, requirement_id: requirementIdText }).orderBy('version_no', 'asc');
    expect(versions.length).toBe(2);
    expect(versions[0].evidence_status).toBe('SUPERSEDED'); // Version 1
    expect(versions[1].evidence_status).toBe('DRAFT'); // Version 2
  });
});
