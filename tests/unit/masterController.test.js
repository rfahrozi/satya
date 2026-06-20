const { getSatkers, createSatker, updateSatker, deleteSatker, getReportTypes, createReportType, updateReportType, deleteReportType, getDeadlines, createDeadline, updateDeadline, deleteDeadline } = require('../../src/controllers/masterController');
const knex = require('../../src/config/knex');
const { AppError } = require('../../src/middlewares/errorHandler');

jest.mock('../../src/config/knex');

describe('masterController Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            tenant: { role: 'ADMIN_PT' },
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    // Helper mock functions
    const mockKnexChain = (methods = {}) => {
        const chain = {};
        ['select', 'where', 'insert', 'update', 'del', 'orderBy', 'join'].forEach(method => {
            chain[method] = jest.fn().mockReturnValue(chain);
        });
        Object.assign(chain, methods);
        // default mock for then
        if (!chain.then) chain.then = jest.fn((cb) => cb([]));
        return chain;
    };

    describe('Satkers', () => {
        it('getSatkers - should return satkers', async () => {
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([{ id: 1, nama_satker: 'Test' }])) });
            knex.mockReturnValue(mKnex);

            await getSatkers(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1, nama_satker: 'Test' }] });
        });

        it('createSatker - should reject if not admin', async () => {
            req.tenant.role = 'SATKER_PN';
            await createSatker(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('createSatker - should reject if no nama_satker', async () => {
            await createSatker(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('createSatker - should create satker', async () => {
            req.body = { nama_satker: 'New Satker' };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([1])) });
            knex.mockReturnValue(mKnex);

            await createSatker(req, res, next);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Satker berhasil ditambahkan.' });
        });

        it('updateSatker - should update satker', async () => {
            req.params = { id: 1 };
            req.body = { nama_satker: 'Updated Satker' };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
            knex.mockReturnValue(mKnex);

            await updateSatker(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Satker berhasil diperbarui.' });
        });

        it('deleteSatker - should delete satker', async () => {
            req.params = { id: 1 };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
            knex.mockReturnValue(mKnex);

            await deleteSatker(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Satker berhasil dihapus.' });
        });
    });

    describe('Report Types', () => {
        it('getReportTypes - should return report types', async () => {
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([{ id: 1, nama_laporan: 'Rep' }])) });
            knex.mockReturnValue(mKnex);

            await getReportTypes(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1, nama_laporan: 'Rep' }] });
        });

        it('createReportType - should return 400 if no nama_laporan', async () => {
            await createReportType(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('createReportType - should create report type', async () => {
            req.body = { nama_laporan: 'Rep 1', is_wajib: false };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([1])) });
            knex.mockReturnValue(mKnex);

            await createReportType(req, res, next);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('updateReportType - should update report type', async () => {
            req.params = { id: 1 };
            req.body = { nama_laporan: 'Rep Updated', is_wajib: true };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
            knex.mockReturnValue(mKnex);

            await updateReportType(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('deleteReportType - should delete report type', async () => {
            req.params = { id: 1 };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
            knex.mockReturnValue(mKnex);

            await deleteReportType(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Deadlines', () => {
        it('getDeadlines - should return deadlines', async () => {
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([{ id: 1 }])) });
            knex.mockReturnValue(mKnex);

            await getDeadlines(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('createDeadline - should return 400 if missing fields', async () => {
            await createDeadline(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('createDeadline - should create deadline', async () => {
            req.body = { report_type_id: 1, period_type: 'monthly', day_of_period: 10 };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([1])) });
            knex.mockReturnValue(mKnex);

            await createDeadline(req, res, next);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('updateDeadline - should update deadline', async () => {
            req.params = { id: 1 };
            req.body = { report_type_id: 1, period_type: 'monthly', day_of_period: 15 };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
            knex.mockReturnValue(mKnex);

            await updateDeadline(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('deleteDeadline - should delete deadline', async () => {
            req.params = { id: 1 };
            const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
            knex.mockReturnValue(mKnex);

            await deleteDeadline(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
