/**
 * Unit Test: Report Controller - Admin Endpoints
 * Menguji getAdminStats, getQueueStatus, dan edge cases verifyReport
 * menggunakan mocking pada service/repository layer
 */

process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';

// === MOCKS ===
jest.mock('../../src/config/minio');
jest.mock('../../src/emailWorker', () => ({
    emailQueue: {
        add: jest.fn().mockResolvedValue({ id: '1' }),
        getWaitingCount: jest.fn().mockResolvedValue(5),
        getActiveCount: jest.fn().mockResolvedValue(2),
        getCompletedCount: jest.fn().mockResolvedValue(100),
        getFailedCount: jest.fn().mockResolvedValue(3),
        getDelayedCount: jest.fn().mockResolvedValue(0),
        getFailed: jest.fn().mockResolvedValue([
            { id: '10', name: 'sendRevisionEmail', failedReason: 'SMTP timeout', timestamp: Date.now() }
        ]),
    },
    emailWorker: { on: jest.fn() }
}));

const reportController = require('../../src/controllers/reportController');
const reportRepo = require('../../src/repositories/reportRepo');
const reportService = require('../../src/services/reportService');
const { AppError } = require('../../src/middlewares/errorHandler');

// Mock repos & service
jest.mock('../../src/repositories/reportRepo');
jest.mock('../../src/services/reportService');

describe('Unit Test: reportController - Admin Endpoints', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
            query: { bulan: '3', tahun: '2026' },
            tenant: { userId: 1, role: 'ADMIN_PT', satkerId: null },
            file: null,
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('getAdminStats()', () => {
        it('harus menolak jika bukan ADMIN_PT', async () => {
            mockReq.tenant.role = 'SATKER_PN';
            await reportController.getAdminStats(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus mengembalikan admin stats lengkap', async () => {
            reportRepo.getAntrianVerifikasi.mockResolvedValue([
                { submission_id: 1, nama_laporan: 'Test', nama_satker: 'PN Test' }
            ]);
            reportRepo.getLoopRevisi.mockResolvedValue([]);
            reportRepo.getKetepatanWaktu.mockResolvedValue({
                tepat_waktu: '10', terlambat: '2', total_upload: '12'
            });
            reportRepo.getRecentActivity.mockResolvedValue([
                { id: 1, nama_satker: 'PN Test', nama_laporan: 'Lap Test', status_verifikasi: 'lengkap' }
            ]);

            await reportController.getAdminStats(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.data.antrian_verifikasi.jumlah).toBe(1);
            expect(response.data.ketepatan_waktu.tepat_waktu).toBe('10');
        });

        it('harus menggunakan default period saat query kosong', async () => {
            mockReq.query = {}; // bulan & tahun kosong
            reportRepo.getAntrianVerifikasi.mockResolvedValue([]);
            reportRepo.getLoopRevisi.mockResolvedValue([]);
            reportRepo.getKetepatanWaktu.mockResolvedValue({ tepat_waktu: '0', terlambat: '0', total_upload: '0' });
            reportRepo.getRecentActivity.mockResolvedValue([]);

            await reportController.getAdminStats(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('harus meneruskan error ke next', async () => {
            reportRepo.getAntrianVerifikasi.mockRejectedValue(new Error('DB connection lost'));
            await reportController.getAdminStats(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('getQueueStatus()', () => {
        it('harus menolak jika bukan ADMIN_PT', async () => {
            mockReq.tenant.role = 'PIMPINAN';
            await reportController.getQueueStatus(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus mengembalikan status queue BullMQ', async () => {
            await reportController.getQueueStatus(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.data.waiting).toBe(5);
            expect(response.data.completed).toBe(100);
            expect(response.data.failed).toBe(3);
            expect(response.data.recent_failed).toHaveLength(1);
            expect(response.data.recent_failed[0].failedReason).toBe('SMTP timeout');
        });
    });

    describe('verifyReport() edge cases', () => {
        it('harus menolak jika status verifikasi tidak valid', async () => {
            mockReq.params.id = '5';
            mockReq.body = { status_verifikasi: 'invalid_status', catatan_admin: '' };
            await reportController.verifyReport(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus menolak jika status verifikasi kosong', async () => {
            mockReq.params.id = '5';
            mockReq.body = { catatan_admin: 'test' };
            await reportController.verifyReport(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus berhasil verifikasi dengan status lengkap', async () => {
            mockReq.params.id = '5';
            mockReq.body = { status_verifikasi: 'lengkap', catatan_admin: 'OK bagus' };
            reportService.verifyAndNotify.mockResolvedValue();
            await reportController.verifyReport(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('harus meneruskan error service ke next', async () => {
            mockReq.params.id = '5';
            mockReq.body = { status_verifikasi: 'lengkap', catatan_admin: '' };
            reportService.verifyAndNotify.mockRejectedValue(new Error('DB Error'));
            await reportController.verifyReport(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('getDashboardAgregat()', () => {
        it('harus mengembalikan data formatted dengan statistik', async () => {
            reportRepo.getRekapitulasiPimpinan.mockResolvedValue([
                {
                    nama_satker: 'PN Test',
                    total_wajib: '28',
                    total_upload: '20',
                    detail_laporan: [
                        { nama_laporan: 'Lap 1', report_type_id: 1, submission_id: 1, status_verifikasi: 'lengkap', status_ketepatan_waktu: 'Tepat Waktu' },
                        { nama_laporan: 'Lap 2', report_type_id: 2, submission_id: null, status_verifikasi: null, status_ketepatan_waktu: null },
                    ]
                }
            ]);

            await reportController.getDashboardAgregat(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.data[0].statistik.persentase_kepatuhan).toBe('71%');
            expect(response.data[0].statistik.belum_upload).toBe(8);
            expect(response.data[0].detail_laporan[0].status_upload).toBe('sudah_upload');
            expect(response.data[0].detail_laporan[1].status_upload).toBe('belum_upload');
        });

        it('harus menangani total_wajib = 0 tanpa error', async () => {
            reportRepo.getRekapitulasiPimpinan.mockResolvedValue([
                {
                    nama_satker: 'PN Kosong',
                    total_wajib: '0',
                    total_upload: '0',
                    detail_laporan: []
                }
            ]);

            await reportController.getDashboardAgregat(mockReq, mockRes, mockNext);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.data[0].statistik.persentase_kepatuhan).toBe('0%');
        });
    });

    describe('uploadReport()', () => {
        it('harus menolak jika tidak ada file', async () => {
            mockReq.body = { report_type_id: 1, periode_bulan: 3, periode_tahun: 2026 };
            mockReq.file = null;
            await reportController.uploadReport(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus menolak jika metadata tidak lengkap', async () => {
            mockReq.body = {};
            mockReq.file = { originalname: 'test.pdf', buffer: Buffer.from('test'), size: 100, mimetype: 'application/pdf' };
            await reportController.uploadReport(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus berhasil upload file', async () => {
            mockReq.body = { report_type_id: '1', periode_bulan: '3', periode_tahun: '2026' };
            mockReq.file = { originalname: 'test.pdf', buffer: Buffer.from('test'), size: 100, mimetype: 'application/pdf' };
            reportService.uploadReportDocument.mockResolvedValue({ id: 1 });
            await reportController.uploadReport(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });
    });

    describe('getMyProgress()', () => {
        it('harus menolak jika periode kosong', async () => {
            mockReq.query = {};
            await reportController.getMyProgress(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus mengembalikan progress data', async () => {
            mockReq.query = { bulan: '3', tahun: '2026' };
            mockReq.tenant.satkerId = 1;
            reportRepo.getSatkerProgress.mockResolvedValue([
                { report_type_id: 1, nama_laporan: 'Test', submission_id: 1 }
            ]);
            await reportController.getMyProgress(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getDownloadUrl()', () => {
        it('harus mengembalikan presigned URL', async () => {
            mockReq.params.id = '1';
            reportService.generatePresignedUrl.mockResolvedValue('http://mock.url/file.pdf');
            await reportController.getDownloadUrl(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json.mock.calls[0][0].data.url).toContain('/api/v1/reports/proxy?url=');
            expect(mockRes.json.mock.calls[0][0].data.url).toContain(encodeURIComponent('http://mock.url/file.pdf'));
        });

        it('harus meneruskan error ke next', async () => {
            mockReq.params.id = '999';
            reportService.generatePresignedUrl.mockRejectedValue(new AppError('Not found', 404));
            await reportController.getDownloadUrl(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });
    });

    describe('deleteReport()', () => {
        it('harus berhasil menghapus laporan', async () => {
            mockReq.params.id = '1';
            reportService.deleteReportDocument.mockResolvedValue();
            await reportController.deleteReport(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('harus meneruskan error ke next', async () => {
            mockReq.params.id = '999';
            reportService.deleteReportDocument.mockRejectedValue(new AppError('Not found', 404));
            await reportController.deleteReport(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });
    });
});
