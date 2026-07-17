/**
 * Smoke Test: Application Module Graph & Basic Access
 */
process.env.PT_INTERNAL_MONITORING_ENABLED = 'true'; // Enable module for testing

const request = require('supertest');
const { clearDatabase, closeDatabase } = require('../setup');

// Mock external dependencies if needed
jest.mock('../../src/config/minio', () => ({}), { virtual: true });
jest.mock('../../src/emailWorker', () => ({}), { virtual: true });

describe('application module graph', () => {
  it('loads the Express application without unresolved modules', () => {
    expect(() => require('../../src/app')).not.toThrow();
  });
});

describe('Internal Monitoring Smoke Test', () => {
  let app;
  let satkerToken;

  beforeAll(async () => {
    await clearDatabase();
    app = require('../../src/app');
    
    // Login as PN to get token
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'pn_tpi', password: 'password123' });
    
    if (res.body?.data?.token) {
      satkerToken = res.body.data.token;
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('GET /health → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/internal-monitoring/periods tanpa token → 401', async () => {
    const res = await request(app).get('/api/v1/internal-monitoring/periods');
    expect(res.status).toBe(401);
  });

  it('role PN mengakses internal monitoring → 403', async () => {
    // Pastikan token berhasil didapat
    expect(satkerToken).toBeDefined();

    const res = await request(app)
      .get('/api/v1/internal-monitoring/periods')
      .set('Authorization', `Bearer ${satkerToken}`);
    
    expect(res.status).toBe(403);
  });
});
