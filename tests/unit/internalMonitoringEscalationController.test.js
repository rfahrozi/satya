const escalationController = require('../../src/controllers/internalMonitoringEscalationController');
const escalationService = require('../../src/services/internalMonitoringEscalationService');
const knex = require('../../src/config/knex');

jest.mock('../../src/services/internalMonitoringEscalationService');
jest.mock('../../src/config/knex', () => {
    const mKnex = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 1 }]),
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        orderBy: jest.fn().mockResolvedValue([{ id: 1, title: 'test' }])
    });
    return mKnex;
});

describe('Unit Test: internalMonitoringEscalationController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            params: { id: '1' },
            body: { note: 'test note', is_active: false },
            user: { id: 1, role: 'ADMIN_PT' }
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('listRules', () => {
        it('harus memanggil knex dan merespons dengan data', async () => {
            const knexMock = require('../../src/config/knex');
            knexMock.mockReturnValueOnce(Promise.resolve([{ id: 1 }]));
            
            await escalationController.listRules(mockReq, mockRes, mockNext);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
        });

        it('harus memanggil next dengan error jika db gagal', async () => {
            const knexMock = require('../../src/config/knex');
            const err = new Error('DB Error');
            knexMock.mockReturnValueOnce(Promise.reject(err));
            
            await escalationController.listRules(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(err);
        });
    });

    describe('createRule', () => {
        it('harus menginsert rule baru dan merespons dengan ID', async () => {
            await escalationController.createRule(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { id: { id: 1 } } });
        });
    });

    describe('updateRule', () => {
        it('harus mengupdate rule dengan safe body', async () => {
            await escalationController.updateRule(mockReq, mockRes, mockNext);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Rule updated' });
        });

        it('harus merespons 400 jika tidak ada data valid', async () => {
            mockReq.body = { invalid_field: 'test' };
            await escalationController.updateRule(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Tidak ada data valid untuk diupdate' });
        });
    });

    describe('listEscalations', () => {
        it('harus memanggil orderBy dan merespons dengan data', async () => {
            await escalationController.listEscalations(mockReq, mockRes, mockNext);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1, title: 'test' }] });
        });
    });

    describe('acknowledgeEscalation', () => {
        it('harus merespons sukses jika service me-return true', async () => {
            escalationService.acknowledgeEscalation.mockResolvedValue(true);
            await escalationController.acknowledgeEscalation(mockReq, mockRes, mockNext);
            expect(escalationService.acknowledgeEscalation).toHaveBeenCalledWith(mockReq.user, '1', 'test note');
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Acknowledged' });
        });

        it('harus merespons 404 jika service me-return false', async () => {
            escalationService.acknowledgeEscalation.mockResolvedValue(false);
            await escalationController.acknowledgeEscalation(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('resolveEscalation', () => {
        it('harus merespons sukses jika service me-return true', async () => {
            escalationService.resolveEscalation.mockResolvedValue(true);
            await escalationController.resolveEscalation(mockReq, mockRes, mockNext);
            expect(escalationService.resolveEscalation).toHaveBeenCalledWith(mockReq.user, '1', 'test note');
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Resolved' });
        });

        it('harus merespons 404 jika service me-return false', async () => {
            escalationService.resolveEscalation.mockResolvedValue(false);
            await escalationController.resolveEscalation(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });
});
