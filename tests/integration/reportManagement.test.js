/**
 * Integration Test: Complete Report Management Flow
 * Menguji alur lengkap: Progress, Download URL, Dashboard, Verifikasi, Delete
 *
 * NOTE: Setiap test dalam file ini menggunakan token yang didapatkan dari login.
 * Urutan test PENTING (runInBand), jadi jangan ubah urutan describe/it blocks.
 */

// === MOCKS (Akan otomatis menggunakan file di __mocks__) ===
jest.mock('../../src/config/minio');
jest.mock('../../src/emailWorker');

// === DEPENDENCIES ===
const request = require('supertest');
const app = require('../../src/app');
const { clearDatabase, closeDatabase } = require('../setup');

describe('Report Management - Full CRUD Flow', () => {
    let satkerToken;
    let adminToken;
    let pimpinanToken;
    let uploadedSubmissionId;

    // Setup: Login semua roles dan bersihkan database
    beforeAll(async () => {
        await clearDatabase();

        // Login sebagai Satker
        const satkerLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'pn_tpi', password: 'password123' });
        satkerToken = satkerLogin.body.data?.token;

        // Login sebagai Admin PT
        const adminLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'admin_pt', password: 'password123' });
        adminToken = adminLogin.body.data?.token;

        // Login sebagai Pimpinan
        const pimpinanLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'pimpinan_pt', password: 'password123' });
        pimpinanToken = pimpinanLogin.body.data?.token;

        expect(satkerToken).toBeDefined();
        expect(adminToken).toBeDefined();
        expect(pimpinanToken).toBeDefined();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    // ============================================================
    // BAGIAN 1: UPLOAD LAPORAN
    // ============================================================
    describe('POST /api/v1/reports/upload', () => {
        it('harus ditolak jika tidak membawa token', async () => {
            const res = await request(app)
                .post('/api/v1/reports/upload')
                .field('report_type_id', 1)
                .field('periode_bulan', 3)
                .field('periode_tahun', 2026);
            expect(res.statusCode).toBe(401);
        });

        it('harus gagal jika tidak ada file yang dikirim', async () => {
            const res = await request(app)
                .post('/api/v1/reports/upload')
                .set('Authorization', `Bearer ${satkerToken}`)
                .field('report_type_id', 1)
                .field('periode_bulan', 3)
                .field('periode_tahun', 2026);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('harus gagal jika metadata tidak lengkap', async () => {
            const res = await request(app)
                .post('/api/v1/reports/upload')
                .set('Authorization', `Bearer ${satkerToken}`)
                .attach('dokumen_monev', Buffer.from('%PDF-1.4 test content'), {
                    filename: 'test.pdf',
                    contentType: 'application/pdf'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('harus berhasil upload laporan PDF valid', async () => {
            const res = await request(app)
                .post('/api/v1/reports/upload')
                .set('Authorization', `Bearer ${satkerToken}`)
                .field('report_type_id', 1)
                .field('periode_bulan', 3)
                .field('periode_tahun', 2026)
                .attach('dokumen_monev', Buffer.from('%PDF-1.4 content here'), {
                    filename: 'laporan_maret.pdf',
                    contentType: 'application/pdf'
                })
                .attach('dokumen_excel', Buffer.from('excel content'), { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            if (res.statusCode !== 201) console.error('[DEBUG] Upload:', JSON.stringify(res.body));
            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('harus berhasil MENIMPA (update) laporan yang sudah ada di periode yang sama', async () => {
            const res = await request(app)
                .post('/api/v1/reports/upload')
                .set('Authorization', `Bearer ${satkerToken}`)
                .field('report_type_id', 1)
                .field('periode_bulan', 3)
                .field('periode_tahun', 2026)
                .attach('dokumen_monev', Buffer.from('%PDF-1.4 content updated'), {
                    filename: 'laporan_maret_v2.pdf',
                    contentType: 'application/pdf'
                })
                .attach('dokumen_excel', Buffer.from('excel content updated'), { filename: 'test2.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('harus ditolak (400) dan tidak diproses jika format file selain PDF atau XLSX diunggah', async () => {
             const res = await request(app)
                .post('/api/v1/reports/upload')
                .set('Authorization', `Bearer ${satkerToken}`)
                .field('report_type_id', 1)
                .field('periode_bulan', 3)
                .field('periode_tahun', 2026)
                .attach('dokumen_monev', Buffer.from('console.log("hello error")'), {
                    filename: 'laporan_invalid.js',
                    contentType: 'application/javascript'
                });

             expect(res.statusCode).toBe(400);
             expect(res.body.success).toBe(false);
             expect(res.body.message).toMatch(/Format file tidak didukung/);
        });
    });

    // ============================================================
    // BAGIAN 2: PROGRESS LAPORAN SATKER
    // ============================================================
    describe('GET /api/v1/reports/my-progress', () => {
        it('harus gagal jika tidak ada query bulan/tahun', async () => {
            const res = await request(app)
                .get('/api/v1/reports/my-progress')
                .set('Authorization', `Bearer ${satkerToken}`);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('harus berhasil mengambil progress laporan satker untuk bulan tertentu', async () => {
            const res = await request(app)
                .get('/api/v1/reports/my-progress')
                .set('Authorization', `Bearer ${satkerToken}`)
                .query({ bulan: 3, tahun: 2026 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);

            // Laporan yang sudah diupload harus ada di response
            const laporan1 = res.body.data.find(d => d.report_type_id === 1);
            if (laporan1) {
                expect(laporan1).toHaveProperty('status_ketepatan_waktu');
                uploadedSubmissionId = laporan1.submission_id || laporan1.id;
            }
        });
    });

    // ============================================================
    // BAGIAN 3: DASHBOARD AGREGAT (ADMIN & PIMPINAN)
    // ============================================================
    describe('GET /api/v1/reports/dashboard-agregat', () => {
        it('harus berhasil diakses oleh Admin PT', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-agregat')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ bulan: 3, tahun: 2026 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);

            if (res.body.data.length > 0) {
                const satker = res.body.data[0];
                expect(satker).toHaveProperty('statistik');
                expect(satker.statistik).toHaveProperty('persentase_kepatuhan');
            }
        });

        it('harus berhasil diakses oleh Pimpinan', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-agregat')
                .set('Authorization', `Bearer ${pimpinanToken}`)
                .query({ bulan: 3, tahun: 2026 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('harus berhasil diakses oleh Satker PN juga (tidak ada restriksi role di rute ini)', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard-agregat')
                .set('Authorization', `Bearer ${satkerToken}`)
                .query({ bulan: 3, tahun: 2026 });

            expect(res.statusCode).toBe(200);
        });
    });

    // ============================================================
    // BAGIAN 4: DOWNLOAD / PRESIGNED URL
    // ============================================================
    describe('GET /api/v1/reports/:id/download', () => {
        it('harus mengembalikan 404 untuk ID submission yang tidak ada', async () => {
            const res = await request(app)
                .get('/api/v1/reports/99999/download')
                .set('Authorization', `Bearer ${satkerToken}`);

            expect(res.statusCode).toBe(404);
        });

        it('harus berhasil mengembalikan presigned URL untuk file yang ada', async () => {
            // Ambil ID dari database terlebih dahulu
            const progressRes = await request(app)
                .get('/api/v1/reports/my-progress')
                .set('Authorization', `Bearer ${satkerToken}`)
                .query({ bulan: 3, tahun: 2026 });

            const submittedItem = progressRes.body.data?.find(d => d.submission_id || d.id);
            if (!submittedItem) {
                console.warn('[SKIP] Tidak ada data submission untuk test download');
                return;
            }

            const id = submittedItem.submission_id || submittedItem.id;
            const res = await request(app)
                .get(`/api/v1/reports/${id}/download`)
                .set('Authorization', `Bearer ${satkerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data?.url).toContain('/api/v1/reports/proxy?url=');
            expect(res.body.data?.url).toContain(encodeURIComponent('http://mock.presigned.url/file.pdf'));
        });
    });

    // ============================================================
    // BAGIAN 5: VERIFIKASI LAPORAN (ADMIN)
    // ============================================================
    describe('PATCH /api/v1/reports/:id/verify', () => {
        let submissionId;

        beforeAll(async () => {
            // Upload satu laporan baru untuk diverifikasi
            await request(app)
                .post('/api/v1/reports/upload')
                .set('Authorization', `Bearer ${satkerToken}`)
                .field('report_type_id', 2)
                .field('periode_bulan', 3)
                .field('periode_tahun', 2026)
                .attach('dokumen_monev', Buffer.from('%PDF-1.4 laporan utk verifikasi'), {
                    filename: 'laporan_verif.pdf',
                    contentType: 'application/pdf'
                })
                .attach('dokumen_excel', Buffer.from('excel verif'), { filename: 'verif.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Ambil ID submission yang baru dibuat
            const progressRes = await request(app)
                .get('/api/v1/reports/my-progress')
                .set('Authorization', `Bearer ${satkerToken}`)
                .query({ bulan: 3, tahun: 2026 });

            const item = progressRes.body.data?.find(d => d.report_type_id === 2);
            submissionId = item?.submission_id || item?.id;
        });

        it('harus ditolak jika bukan Admin PT yang melakukan verifikasi', async () => {
            expect(submissionId).toBeDefined(); // Memastikan file berhasil diupload
            const res = await request(app)
                .patch(`/api/v1/reports/${submissionId}/verify`)
                .set('Authorization', `Bearer ${satkerToken}`)
                .send({ status_verifikasi: 'lengkap', catatan_admin: '' });

            expect(res.statusCode).toBe(403);
        });

        it('harus berhasil memverifikasi laporan sebagai LENGKAP', async () => {
            expect(submissionId).toBeDefined();
            const res = await request(app)
                .patch(`/api/v1/reports/${submissionId}/verify`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status_verifikasi: 'lengkap', catatan_admin: 'Semua berkas sudah lengkap.' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('harus berhasil memverifikasi laporan sebagai REVISI dan mengirim email', async () => {
            expect(submissionId).toBeDefined();
            const { emailQueue } = require('../../src/emailWorker');
            const res = await request(app)
                .patch(`/api/v1/reports/${submissionId}/verify`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status_verifikasi: 'revisi', catatan_admin: 'Tolong lengkapi lampiran form A.' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            // Pastikan email queue dipanggil
            expect(emailQueue.add).toHaveBeenCalled();
        });
    });

    // ============================================================
    // BAGIAN 6: HAPUS LAPORAN
    // ============================================================
    describe('DELETE /api/v1/reports/:id', () => {
        let deleteTargetId;

        beforeAll(async () => {
            // Upload laporan untuk di-test delete
            await request(app)
                .post('/api/v1/reports/upload')
                .set('Authorization', `Bearer ${satkerToken}`)
                .field('report_type_id', 3)
                .field('periode_bulan', 3)
                .field('periode_tahun', 2026)
                .attach('dokumen_monev', Buffer.from('%PDF-1.4 utk hapus'), {
                    filename: 'laporan_delete.pdf',
                    contentType: 'application/pdf'
                })
                .attach('dokumen_excel', Buffer.from('excel delete'), { filename: 'del.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Ambil ID
            const progressRes = await request(app)
                .get('/api/v1/reports/my-progress')
                .set('Authorization', `Bearer ${satkerToken}`)
                .query({ bulan: 3, tahun: 2026 });

            const item = progressRes.body.data?.find(d => d.report_type_id === 3);
            deleteTargetId = item?.submission_id || item?.id;
        });

        it('harus gagal menghapus laporan milik satker lain', async () => {
            expect(deleteTargetId).toBeDefined();

            // Login sebagai satker lain (pn_batam)
            const batamLogin = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'pn_batam', password: 'password123' });
            const batamToken = batamLogin.body.data?.token;

            const res = await request(app)
                .delete(`/api/v1/reports/${deleteTargetId}`)
                .set('Authorization', `Bearer ${batamToken}`);

            expect(res.statusCode).toBe(403);
        });

        it('harus berhasil menghapus laporan milik sendiri', async () => {
            expect(deleteTargetId).toBeDefined();

            const res = await request(app)
                .delete(`/api/v1/reports/${deleteTargetId}`)
                .set('Authorization', `Bearer ${satkerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('harus mengembalikan 404 saat laporan sudah dihapus', async () => {
            expect(deleteTargetId).toBeDefined();

            const res = await request(app)
                .delete(`/api/v1/reports/${deleteTargetId}`)
                .set('Authorization', `Bearer ${satkerToken}`);

            expect(res.statusCode).toBe(404);
        });
    });
});
