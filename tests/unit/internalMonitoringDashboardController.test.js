const dashboardController = require('../../src/controllers/internalMonitoringDashboardController');
const dashboardService = require('../../src/services/internalMonitoringDashboardService');

jest.mock('../../src/services/internalMonitoringDashboardService');

describe('Unit Test: internalMonitoringDashboardController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            query: { period_id: '1', limit: '10', offset: '0' },
            user: { id: 1, role: 'KPT' }
        };
        mockRes = {
            json: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('getMyDashboard', () => {
        it('harus memanggil dashboardService.getMyDashboard dan merespons dengan data', async () => {
            dashboardService.getMyDashboard.mockResolvedValue({ summary: { total: 5 } });
            await dashboardController.getMyDashboard(mockReq, mockRes, mockNext);
            expect(dashboardService.getMyDashboard).toHaveBeenCalledWith('1', mockReq.user);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { summary: { total: 5 } } });
        });

        it('harus memanggil next dengan error jika service gagal', async () => {
            const err = new Error('Database error');
            dashboardService.getMyDashboard.mockRejectedValue(err);
            await dashboardController.getMyDashboard(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(err);
        });
    });

    describe('getOperationalDashboard', () => {
        it('harus memanggil dashboardService.getOperationalDashboard dan merespons dengan data', async () => {
            dashboardService.getOperationalDashboard.mockResolvedValue({ summary: { total: 10 } });
            await dashboardController.getOperationalDashboard(mockReq, mockRes, mockNext);
            expect(dashboardService.getOperationalDashboard).toHaveBeenCalledWith('1', mockReq.user);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { summary: { total: 10 } } });
        });

        it('harus memanggil next dengan error jika service gagal', async () => {
            const err = new Error('Database error');
            dashboardService.getOperationalDashboard.mockRejectedValue(err);
            await dashboardController.getOperationalDashboard(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(err);
        });
    });

    describe('getExecutiveDashboard', () => {
        it('harus memanggil dashboardService.getExecutiveDashboard dan merespons dengan data', async () => {
            dashboardService.getExecutiveDashboard.mockResolvedValue({ complianceRate: 90 });
            await dashboardController.getExecutiveDashboard(mockReq, mockRes, mockNext);
            expect(dashboardService.getExecutiveDashboard).toHaveBeenCalledWith('1', mockReq.user);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { complianceRate: 90 } });
        });

        it('harus memanggil next dengan error jika service gagal', async () => {
            const err = new Error('Database error');
            dashboardService.getExecutiveDashboard.mockRejectedValue(err);
            await dashboardController.getExecutiveDashboard(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(err);
        });
    });

    describe('listReviewQueue', () => {
        it('harus memanggil dashboardService.listReviewQueue dengan pagination', async () => {
            dashboardService.listReviewQueue.mockResolvedValue([{ id: 1 }]);
            await dashboardController.listReviewQueue(mockReq, mockRes, mockNext);
            expect(dashboardService.listReviewQueue).toHaveBeenCalledWith('1', { limit: 10, offset: 0 }, mockReq.user);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
        });

        it('harus menggunakan default pagination jika query tidak ada', async () => {
            mockReq.query = {};
            dashboardService.listReviewQueue.mockResolvedValue([]);
            await dashboardController.listReviewQueue(mockReq, mockRes, mockNext);
            expect(dashboardService.listReviewQueue).toHaveBeenCalledWith(undefined, { limit: 20, offset: 0 }, mockReq.user);
        });

        it('harus memanggil next dengan error jika service gagal', async () => {
            const err = new Error('Database error');
            dashboardService.listReviewQueue.mockRejectedValue(err);
            await dashboardController.listReviewQueue(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(err);
        });
    });

    describe('listFollowUpQueue', () => {
        it('harus memanggil dashboardService.listFollowUpQueue dengan pagination', async () => {
            dashboardService.listFollowUpQueue.mockResolvedValue([{ id: 2 }]);
            await dashboardController.listFollowUpQueue(mockReq, mockRes, mockNext);
            expect(dashboardService.listFollowUpQueue).toHaveBeenCalledWith('1', { limit: 10, offset: 0 }, mockReq.user);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [{ id: 2 }] });
        });

        it('harus menggunakan default pagination jika query tidak ada', async () => {
            mockReq.query = {};
            dashboardService.listFollowUpQueue.mockResolvedValue([]);
            await dashboardController.listFollowUpQueue(mockReq, mockRes, mockNext);
            expect(dashboardService.listFollowUpQueue).toHaveBeenCalledWith(undefined, { limit: 20, offset: 0 }, mockReq.user);
        });

        it('harus memanggil next dengan error jika service gagal', async () => {
            const err = new Error('Database error');
            dashboardService.listFollowUpQueue.mockRejectedValue(err);
            await dashboardController.listFollowUpQueue(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(err);
        });
    });
});
