/**
 * Integration Test: End-to-End Report Flow
 * Menguji alur lengkap Login → Upload Laporan
 *
 * Mock eksternal (MinIO & emailWorker) harus dideklarasikan
 * di sini sebelum `require('../../src/app')` agar Jest hoisting bekerja.
 */

// === MOCKS (Akan otomatis menggunakan file di __mocks__) ===
jest.mock('../../src/config/minio');
jest.mock('../../src/emailWorker');

// === DEPENDENCIES ===
const request = require('supertest');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const { clearDatabase, closeDatabase } = require('../setup');

describe('End-to-End Report Flow', () => {
    let token;

    beforeAll(async () => {
        await clearDatabase();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    it('Should login and upload report successfully', async () => {
        // 1. Login sebagai Satker PN (yang memiliki satker_id valid)
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'pn_tpi', password: 'password123' });

        expect(loginRes.statusCode).toBe(200);
        token = loginRes.body.data?.token;
        expect(token).toBeDefined();

        // 2. Upload Laporan (Happy Path)
        const res = await request(app)
            .post('/api/v1/reports/upload')
            .set('Authorization', `Bearer ${token}`)
            .field('report_type_id', 1)
            .field('periode_bulan', 4)
            .field('periode_tahun', 2026)
            .attach('dokumen_monev', Buffer.from('%PDF-1.4 test content'), { filename: 'test.pdf', contentType: 'application/pdf' })
            .attach('dokumen_excel', Buffer.from('test excel content'), { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        if (res.statusCode !== 201) console.error('[DEBUG] Upload response:', JSON.stringify(res.body));
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
    });
});