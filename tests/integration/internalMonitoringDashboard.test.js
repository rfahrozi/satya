process.env.PT_INTERNAL_MONITORING_ENABLED = 'true';
const request = require('supertest');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const bcrypt = require('bcryptjs');

// Mock minio to prevent Minio.Client initialization error during testing
jest.mock('../../src/config/minio');

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

describe('Internal Monitoring - Dashboard Read Models', () => {
  let tokenCollector;
  let tokenApprover;
  let tokenVerifier;
  let tokenPimpinan;

  beforeAll(async () => {
    await clearDatabase();

    const pwd = await bcrypt.hash('password123', 10);
    await knex('users').insert([
      { id: 901, username: 'collector', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 902, username: 'approver', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 903, username: 'verifier', password_hash: pwd, role: 'UNIT_PIC', is_active: true },
      { id: 904, username: 'pimpinan', password_hash: pwd, role: 'PIMPINAN', is_active: true }
    ]);

    await knex('monitoring_periods').insert({
      id: 901,
      name: 'Dash Period', year: 2026, month: 7, start_date: '2026-07-01', end_date: '2026-07-31', status: 'OPEN', created_by: 903
    });

    await knex('monitoring_packages').insert({ id: 901, code: 'PKG', name: 'Pkg' });
    await knex('monitoring_items').insert([
      { id: 901, package_id: 901, item_code: 'DASH-1', title: 'Dash 1', frequency_type: 'MONTHLY' },
      { id: 902, package_id: 901, item_code: 'DASH-2', title: 'Dash 2', frequency_type: 'MONTHLY' }
    ]);
    
    // Create multiple targets to simulate dashboard metrics
    const targetsToInsert = [
      { id: 901, natural_key: 'NK_D1', period_id: 901, monitoring_item_id: 901, workflow_status: 'VERIFIED', lock_version: 1, due_at: '2026-07-31T00:00:00Z', due_date: '2026-07-31', was_submitted_late: false },
      { id: 902, natural_key: 'NK_D2', period_id: 901, monitoring_item_id: 902, workflow_status: 'IN_PROGRESS', lock_version: 1, due_at: '2026-07-31T00:00:00Z', due_date: '2026-07-31', was_submitted_late: false },
      { id: 903, natural_key: 'NK_D3', period_id: 901, monitoring_item_id: 901, workflow_status: 'AWAITING_APPROVAL', lock_version: 1, due_at: '2026-07-31T00:00:00Z', due_date: '2026-07-31', was_submitted_late: false },
      { id: 904, natural_key: 'NK_D4', period_id: 901, monitoring_item_id: 902, workflow_status: 'NOT_STARTED', lock_version: 1, due_at: '2026-07-01T00:00:00Z', due_date: '2026-07-01', was_submitted_late: false }
    ];

    await knex('monitoring_targets').insert(targetsToInsert);

    await knex('monitoring_target_assignees').insert([
      { monitoring_target_id: 901, user_id: 901, capability: 'COLLECTOR' },
      { monitoring_target_id: 902, user_id: 901, capability: 'COLLECTOR' },
      { monitoring_target_id: 903, user_id: 901, capability: 'COLLECTOR' },
      { monitoring_target_id: 904, user_id: 901, capability: 'COLLECTOR' },
      
      { monitoring_target_id: 901, user_id: 903, capability: 'VERIFIER' },
      { monitoring_target_id: 902, user_id: 903, capability: 'VERIFIER' }
    ]);

    await knex('monitoring_follow_ups').insert([
      { monitoring_target_id: 901, title: 'FU 1', owner_user_id: 901, due_at: '2026-08-15T00:00:00Z', status: 'OPEN', created_by: 903 }
    ]);

    const resCol = await request(app).post('/api/v1/auth/login').send({ username: 'collector', password: 'password123' });
    tokenCollector = resCol.body.data.token;
    
    const resApp = await request(app).post('/api/v1/auth/login').send({ username: 'approver', password: 'password123' });
    tokenApprover = resApp.body.data.token;
    
    const resVer = await request(app).post('/api/v1/auth/login').send({ username: 'verifier', password: 'password123' });
    tokenVerifier = resVer.body.data.token;
    
    const resPim = await request(app).post('/api/v1/auth/login').send({ username: 'pimpinan', password: 'password123' });
    tokenPimpinan = resPim.body.data.token;
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  it('1. getMyDashboard retrieves correct summary for user', async () => {
    const res = await request(app)
      .get('/api/v1/internal-monitoring/dashboard/my?period_id=901')
      .set('Authorization', `Bearer ${tokenCollector}`);

    expect(res.status).toBe(200);
    const summary = res.body.data.summary;
    expect(summary.total).toBe(4);
    expect(summary.notStarted).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.awaitingApproval).toBe(1);
    expect(summary.verified).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.openFollowUps).toBe(1);
  });

  it('2. getOperationalDashboard retrieves correct overview', async () => {
    const res = await request(app)
      .get('/api/v1/internal-monitoring/dashboard/operational?period_id=901')
      .set('Authorization', `Bearer ${tokenVerifier}`);

    expect(res.status).toBe(200);
    const summary = res.body.data.summary;
    expect(summary.totalTargets).toBe(4);
    expect(summary.verified).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.openFollowUps).toBe(1);
  });

  it('3. getExecutiveDashboard retrieves correct KPI rates', async () => {
    const res = await request(app)
      .get('/api/v1/internal-monitoring/dashboard/executive?period_id=901')
      .set('Authorization', `Bearer ${tokenPimpinan}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.complianceRate).toBe(25); // 1 verified out of 4 applicable
    expect(data.verifiedOnTimeRate).toBe(25); // 1 verified on time out of 4 applicable
    expect(data.overdueCount).toBe(1);
    expect(data.openFollowUpCount).toBe(1);
  });

  it('4. listReviewQueue retrieves items awaiting review', async () => {
    const res = await request(app)
      .get('/api/v1/internal-monitoring/review-queue?period_id=901')
      .set('Authorization', `Bearer ${tokenVerifier}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].workflow_status).toBe('AWAITING_APPROVAL');
  });

  it('5. listFollowUpQueue retrieves open follow ups', async () => {
    const res = await request(app)
      .get('/api/v1/internal-monitoring/follow-up-queue?period_id=901')
      .set('Authorization', `Bearer ${tokenVerifier}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('OPEN');
  });
});
