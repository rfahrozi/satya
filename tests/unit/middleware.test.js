/**
 * Unit Test: Middleware - tenantContext & errorHandler
 * Menguji middleware autentikasi dan penanganan error
 */

process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';

const jwt = require('jsonwebtoken');

// Mock redis client
jest.mock('../../src/config/redis', () => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK')
}));

const tenantContext = require('../../src/middlewares/tenant');
const { AppError, errorHandler, notFoundHandler } = require('../../src/middlewares/errorHandler');

describe('Unit Test: Middleware', () => {
    describe('tenantContext', () => {
        let mockReq, mockRes, mockNext;

        beforeEach(() => {
            mockReq = { headers: {} };
            mockRes = {};
            mockNext = jest.fn();
        });

        it('harus menolak jika tidak ada Authorization header', async () => {
            await tenantContext(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
        });

        it('harus menolak jika Authorization header tidak dimulai dengan Bearer', async () => {
            mockReq.headers.authorization = 'Basic abc123';
            await tenantContext(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus menolak jika token invalid', async () => {
            mockReq.headers.authorization = 'Bearer invalid.token.here';
            await tenantContext(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus mengekstrak tenant dari token valid', async () => {
            const token = jwt.sign({ id: 1, role: 'ADMIN_PT', satkerId: null }, process.env.JWT_SECRET);
            mockReq.headers.authorization = `Bearer ${token}`;
            await tenantContext(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(); // no error
            expect(mockReq.tenant).toEqual(expect.objectContaining({ userId: 1, role: 'ADMIN_PT', satkerId: null }));
        });

        it('harus mengekstrak satkerId dari token satker', async () => {
            const token = jwt.sign({ id: 5, role: 'SATKER_PN', satkerId: 2 }, process.env.JWT_SECRET);
            mockReq.headers.authorization = `Bearer ${token}`;
            await tenantContext(mockReq, mockRes, mockNext);
            expect(mockReq.tenant.satkerId).toBe(2);
            expect(mockReq.tenant.role).toBe('SATKER_PN');
        });
    });

    describe('errorHandler', () => {
        let mockReq, mockRes, mockNext;

        beforeEach(() => {
            mockReq = { originalUrl: '/api/v1/test' };
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            mockNext = jest.fn();
        });

        it('harus mengembalikan 500 default jika statusCode tidak diberikan', () => {
            const err = new Error('Unexpected error');
            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                status: 'error',
            }));
        });

        it('harus menggunakan statusCode dari AppError', () => {
            const err = new AppError('Not Found', 404);
            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                status: 'fail',
            }));
        });

        it('harus menyembunyikan stack trace di non-dev mode', () => {
            const origEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            const err = new AppError('Test error', 400);
            errorHandler(err, mockReq, mockRes, mockNext);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.stack).toBeUndefined();
            process.env.NODE_ENV = origEnv;
        });
    });

    describe('notFoundHandler', () => {
        it('harus memanggil next dengan AppError 404', () => {
            const mockReq = { originalUrl: '/api/v1/unknown' };
            const mockRes = {};
            const mockNext = jest.fn();
            notFoundHandler(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
        });
    });
});
