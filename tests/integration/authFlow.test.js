/**
 * Integration Test: Authentication & User Management Flow
 * Menguji alur Login, CRUD User oleh Admin PT
 */

// === MOCKS (Akan otomatis menggunakan file di __mocks__) ===
jest.mock('../../src/config/minio');
jest.mock('../../src/emailWorker');

// === DEPENDENCIES ===
const request = require('supertest');
const app = require('../../src/app');
const { clearDatabase, closeDatabase } = require('../setup');

describe('Authentication & User Management Flow', () => {
    let adminToken;
    let satkerToken;

    beforeAll(async () => {
        await clearDatabase();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    // ============================================================
    // BAGIAN 1: LOGIN
    // ============================================================
    describe('POST /api/v1/auth/login', () => {
        it('harus gagal jika username/password kosong', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('harus gagal dengan kredensial salah', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'admin_pt', password: 'salah_password' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('harus berhasil login sebagai Admin PT dan mengembalikan token', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'admin_pt', password: 'password123' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data?.token).toBeDefined();
            adminToken = res.body.data.token;
        });

        it('harus berhasil login sebagai Satker PN dan mengembalikan token', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'pn_tpi', password: 'password123' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data?.token).toBeDefined();
            satkerToken = res.body.data.token;
        });

        it('harus berhasil login sebagai Pimpinan dan mengembalikan token', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'pimpinan_pt', password: 'password123' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data?.token).toBeDefined();
        });
    });

    // ============================================================
    // BAGIAN 2: MANAJEMEN USER (ADMIN)
    // ============================================================
    describe('GET /api/v1/auth/users', () => {
        it('harus ditolak jika tidak ada token', async () => {
            const res = await request(app).get('/api/v1/auth/users');
            expect(res.statusCode).toBe(401);
        });

        it('harus ditolak jika role bukan Admin PT', async () => {
            const res = await request(app)
                .get('/api/v1/auth/users')
                .set('Authorization', `Bearer ${satkerToken}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('harus berhasil mengambil daftar user sebagai Admin PT', async () => {
            const res = await request(app)
                .get('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            // Tidak boleh menampilkan akun admin lain
            const adminAccounts = res.body.data.filter(u => u.role === 'ADMIN_PT');
            expect(adminAccounts).toHaveLength(0);
        });
    });

    describe('POST /api/v1/auth/users', () => {
        it('harus berhasil membuat akun satker baru', async () => {
            const uniqueUsername = `pn_karimun_${Date.now()}`;
            const res = await request(app)
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: uniqueUsername,
                    password: 'testpass789',
                    role: 'SATKER_PN',
                    satker_id: 3
                });

            if (res.statusCode !== 201) console.error('[DEBUG] Create user response:', JSON.stringify(res.body));
            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('harus gagal membuat akun tanpa password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'pn_tanpa_password',
                    role: 'SATKER_PN',
                    satker_id: 4
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('harus ditolak jika bukan Admin PT yang membuat user', async () => {
            const res = await request(app)
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${satkerToken}`)
                .send({
                    username: 'user_baru',
                    password: 'pass123',
                    role: 'SATKER_PN'
                });

            expect(res.statusCode).toBe(403);
        });
    });

    // ============================================================
    // BAGIAN 3: RUTE TIDAK DITEMUKAN (404)
    // ============================================================
    describe('Rute tidak ditemukan', () => {
        it('harus mengembalikan 404 untuk rute yang tidak ada', async () => {
            const res = await request(app).get('/api/v1/endpoint-tidak-ada');
            expect(res.statusCode).toBe(404);
        });
    });

    // ============================================================
    // BAGIAN 4: HEALTH CHECK
    // ============================================================
    describe('GET /api/v1/health', () => {
        it('harus mengembalikan status healthy', async () => {
            const res = await request(app).get('/api/v1/health');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
