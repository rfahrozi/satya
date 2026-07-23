const reportService = require('../../src/services/reportService');
const { minioClient } = require('../../src/config/minio');
const knex = require('../../src/config/knex');
const { emailQueue } = require('../../src/emailWorker');
const { AppError } = require('../../src/middlewares/errorHandler');

jest.mock('../../src/config/minio', () => ({
    minioClient: {
        putObject: jest.fn(),
        presignedGetObject: jest.fn(),
        removeObject: jest.fn()
    },
    minioUploadBreaker: {
        fire: jest.fn().mockResolvedValue(true)
    },
    BUCKET_NAME: 'test-bucket'
}));

jest.mock('../../src/emailWorker', () => ({
    emailQueue: {
        add: jest.fn().mockResolvedValue({ id: 'mock' })
    }
}));

// Mocking knex
jest.mock('../../src/config/knex', () => {
    const knexFn = jest.fn();
    knexFn.where = jest.fn().mockReturnValue(knexFn);
    knexFn.first = jest.fn().mockReturnValue(knexFn);
    knexFn.insert = jest.fn().mockReturnValue(knexFn);
    knexFn.update = jest.fn().mockReturnValue(knexFn);
    knexFn.del = jest.fn().mockReturnValue(knexFn);
    knexFn.returning = jest.fn().mockReturnValue(knexFn);
    knexFn.join = jest.fn().mockReturnValue(knexFn);
    knexFn.select = jest.fn().mockReturnValue(knexFn);
    knexFn.fn = { now: jest.fn() };
    knexFn.mockImplementation(() => knexFn);
    return knexFn;
});

describe('reportService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('uploadReportDocument()', () => {
        it('should insert new report when not existing', async () => {
            knex.first.mockResolvedValueOnce(null); // existing = null
            minioClient.putObject.mockResolvedValue();
            knex.returning.mockResolvedValueOnce([{ id: 10 }]);

            const tenant = { satkerId: 1, role: 'SATKER_PN' };
            const file = { originalname: 'test.pdf', buffer: Buffer.from('test'), size: 100, mimetype: 'application/pdf' };
            const fileExcel = { originalname: 'test.xlsx', buffer: Buffer.from('test'), size: 100, mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
            
            const result = await reportService.uploadReportDocument(tenant, file, fileExcel, 1, 'monthly', 3, 2026);
            
            expect(result).toBe(10);
            expect(minioClient.putObject).toHaveBeenCalledTimes(2);
            expect(knex.insert).toHaveBeenCalledTimes(2); // One for report_submissions, one for report_revision_logs
        });

        it('should update existing report when existing', async () => {
            knex.first.mockResolvedValueOnce({ id: 5 }); // existing = id:5
            minioClient.putObject.mockResolvedValue();
            knex.update.mockResolvedValueOnce(1); // update returns 1

            const tenant = { satkerId: 1, role: 'SATKER_PN' };
            const file = { originalname: 'test.pdf', buffer: Buffer.from('test'), size: 100, mimetype: 'application/pdf' };
            const fileExcel = { originalname: 'test.xlsx', buffer: Buffer.from('test'), size: 100, mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
            
            const result = await reportService.uploadReportDocument(tenant, file, fileExcel, 1, 'monthly', 3, 2026);
            
            expect(result).toBe(5);
            expect(knex.update).toHaveBeenCalled();
            expect(knex.insert).toHaveBeenCalledTimes(1); // One for report_revision_logs
        });
    });

    describe('generatePresignedUrl()', () => {
        it('should throw 404 if not found', async () => {
            knex.first.mockResolvedValueOnce(null);
            await expect(reportService.generatePresignedUrl(1, { role: 'ADMIN_PT' })).rejects.toThrow(AppError);
        });

        it('should throw 403 if satker id mismatch', async () => {
            knex.first.mockResolvedValueOnce({ id: 1, satker_id: 2 });
            await expect(reportService.generatePresignedUrl(1, { role: 'SATKER_PN', satkerId: 1 })).rejects.toThrow(AppError);
        });

        it('should return presigned URL for PDF', async () => {
            knex.first.mockResolvedValueOnce({ id: 1, satker_id: 1, file_url: 'path.pdf', excel_file_url: 'path.xlsx' });
            minioClient.presignedGetObject.mockResolvedValueOnce('http://url.pdf');
            const url = await reportService.generatePresignedUrl(1, { role: 'SATKER_PN', satkerId: 1 }, 'pdf');
            expect(url).toBe('http://url.pdf');
        });

        it('should return presigned URL for Excel', async () => {
            knex.first.mockResolvedValueOnce({ id: 1, satker_id: 1, file_url: 'path.pdf', excel_file_url: 'path.xlsx' });
            minioClient.presignedGetObject.mockResolvedValueOnce('http://url.xlsx');
            const url = await reportService.generatePresignedUrl(1, { role: 'SATKER_PN', satkerId: 1 }, 'excel');
            expect(url).toBe('http://url.xlsx');
        });
    });

    describe('generatePresignedUrlForHistory()', () => {
        it('should throw 404 if not found', async () => {
            knex.first.mockResolvedValueOnce(null);
            await expect(reportService.generatePresignedUrlForHistory(1, { role: 'ADMIN_PT' })).rejects.toThrow(AppError);
        });

        it('should check permission if SATKER_PN', async () => {
            knex.first.mockResolvedValueOnce({ id: 1, submission_id: 1, file_url: 'log.pdf' }); // log entry
            knex.first.mockResolvedValueOnce({ id: 1, satker_id: 2 }); // submission
            await expect(reportService.generatePresignedUrlForHistory(1, { role: 'SATKER_PN', satkerId: 1 })).rejects.toThrow(AppError);
        });

        it('should return URL if allowed', async () => {
            knex.first.mockResolvedValueOnce({ id: 1, submission_id: 1, file_url: 'log.pdf' });
            minioClient.presignedGetObject.mockResolvedValueOnce('http://log.pdf');
            const url = await reportService.generatePresignedUrlForHistory(1, { role: 'ADMIN_PT' });
            expect(url).toBe('http://log.pdf');
        });
    });

    describe('verifyAndNotify()', () => {
        it('should verify as lengkap and create notification', async () => {
            knex.first.mockResolvedValueOnce({ file_url: 'test.pdf', satker_id: 1, nama_laporan: 'Lap 1' });
            await reportService.verifyAndNotify({ role: 'ADMIN_PT' }, 1, 'lengkap', 'OK', 100);
            
            expect(knex.update).toHaveBeenCalledWith(expect.objectContaining({
                status_verifikasi: 'lengkap',
                catatan_admin: 'OK',
                nilai_angka: 100
            }));
            // Insert log + in_app_notification
            expect(knex.insert).toHaveBeenCalledTimes(2);
            expect(emailQueue.add).not.toHaveBeenCalled();
        });

        it('should verify as revisi and send email', async () => {
            knex.first.mockResolvedValueOnce({ file_url: 'test.pdf', satker_id: 1, nama_laporan: 'Lap 1' });
            knex.first.mockResolvedValueOnce({ satker_email: 'test@satker.com' }); // user detail
            await reportService.verifyAndNotify({ role: 'ADMIN_PT' }, 1, 'revisi', 'Revisi form', 50);
            
            expect(emailQueue.add).toHaveBeenCalledWith('sendRevisionEmail', expect.any(Object), expect.any(Object));
        });
    });

    describe('deleteReportDocument()', () => {
        it('should throw 404 if not found', async () => {
            knex.first.mockResolvedValueOnce(null);
            await expect(reportService.deleteReportDocument({ satkerId: 1 }, 1)).rejects.toThrow(AppError);
        });

        it('should throw 403 if satker mismatches', async () => {
            knex.first.mockResolvedValueOnce({ satker_id: 2 });
            await expect(reportService.deleteReportDocument({ satkerId: 1 }, 1)).rejects.toThrow(AppError);
        });

        it('should delete from MinIO and DB', async () => {
            knex.first.mockResolvedValueOnce({ satker_id: 1, file_url: 'test.pdf' });
            minioClient.removeObject.mockResolvedValueOnce();
            knex.del.mockResolvedValueOnce(1);

            const result = await reportService.deleteReportDocument({ satkerId: 1 }, 1);
            expect(minioClient.removeObject).toHaveBeenCalled();
            expect(knex.del).toHaveBeenCalled();
        });
    });
});
