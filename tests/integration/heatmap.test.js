/**
 * Integration Test: Dashboard Heatmap Kepatuhan
 * Menguji endpoint GET /api/v1/reports/dashboard-heatmap
 *
 * - Akses oleh Admin PT ✓
 * - Akses oleh Pimpinan ✓
 * - Ditolak tanpa token ✗
 * - Struktur response (tahun, stats, data[].sel[12]) ✓
 * - Query param ?tahun= ✓
 */

jest.mock('../../src/config/minio');
jest.mock('../../src/emailWorker');

const request = require('supertest');
const app = require('../../src/app');
const { clearDatabase, closeDatabase } = require('../setup');

describe('Dashboard Heatmap Kepatuhan - Integration Tests', () => {
    let adminToken;
    let pimpinanToken;

    beforeAll(async () => {
        await clearDatabase();

        const adminLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'admin_pt', password: 'password123' });
        adminToken = adminLogin.body.data?.token;

        const pimpinanLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'pimpinan_pt', password: 'password123' });
        pimpinanToken = pimpinanLogin.body.data?.token;

        expect(adminToken).toBeDefined();
        expect(pimpinanToken).toBeDefined();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    describe('GET /api/v1/reports/dashboard-heatmap', () => {

        test('harus ditolak jika tidak membawa token', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap?tahun=2026');
            expect(res.status).toBe(401);
        });

        test('harus berhasil diakses oleh Admin PT', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap?tahun=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.tahun).toBe(2026);
        });

        test('harus berhasil diakses oleh Pimpinan', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap?tahun=2026')
                .set('Authorization', `Bearer ${pimpinanToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('harus mengembalikan array data satker', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap?tahun=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.body.data).toBeInstanceOf(Array);

            // Setiap satker harus memiliki sel 12 bulan
            for (const satker of res.body.data) {
                expect(satker).toHaveProperty('satker_id');
                expect(satker).toHaveProperty('nama_satker');
                expect(satker).toHaveProperty('rata_tahunan');
                expect(satker).toHaveProperty('warna_rata');
                expect(satker.sel).toHaveLength(12);

                // Validasi setiap sel
                for (const sel of satker.sel) {
                    expect(sel).toHaveProperty('bulan');
                    expect(sel.bulan).toBeGreaterThanOrEqual(1);
                    expect(sel.bulan).toBeLessThanOrEqual(12);
                    expect(sel).toHaveProperty('total_wajib');
                    expect(sel).toHaveProperty('total_upload');
                    expect(sel).toHaveProperty('persen');
                    expect(sel).toHaveProperty('warna');
                    expect(['hijau', 'kuning', 'merah', 'abu']).toContain(sel.warna);
                }
            }
        });

        test('harus mengembalikan stats global di level root', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap?tahun=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.body.stats).toBeDefined();
            expect(res.body.stats).toHaveProperty('persen_global');
            expect(res.body.stats).toHaveProperty('total_upload');
            expect(res.body.stats).toHaveProperty('total_wajib');
            expect(res.body.stats).toHaveProperty('satker_merah');
            expect(res.body.stats).toHaveProperty('warna_global');
            expect(['hijau', 'kuning', 'merah', 'abu']).toContain(res.body.stats.warna_global);
        });

        test('harus menggunakan tahun default (sekarang) jika query kosong', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.tahun).toBe(new Date().getFullYear());
        });

        test('harus memiliki sel dengan urutan bulan 1-12 berurutan', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap?tahun=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            if (res.body.data.length === 0) return; // skip jika DB kosong

            const sel = res.body.data[0].sel;
            expect(sel.map(s => s.bulan)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        });

        test('harus merespons dengan tahun berbeda (2025)', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-heatmap?tahun=2025')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.tahun).toBe(2025);
        });
    });
});
