/**
 * Unit Test: Auth Controller
 * Menguji handler HTTP controller secara terisolasi dengan mocking service layer
 */

process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';

const authController = require('../../src/controllers/authController');
const authService = require('../../src/services/authService');
const { AppError } = require('../../src/middlewares/errorHandler');

// Mock authService
jest.mock('../../src/services/authService');

describe('Unit Test: authController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
            tenant: { userId: 1, role: 'ADMIN_PT', satkerId: null },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('login()', () => {
        it('harus memanggil next dengan AppError 400 jika username/password kosong', async () => {
            mockReq.body = {};
            await authController.login(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus mengembalikan token saat login berhasil', async () => {
            mockReq.body = { username: 'admin_pt', password: 'password123' };
            authService.loginUser.mockResolvedValue({ token: 'jwt-token', user: { id: 1 } });
            await authController.login(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('harus mengembalikan 401 saat kredensial salah', async () => {
            mockReq.body = { username: 'admin_pt', password: 'wrong' };
            authService.loginUser.mockRejectedValue(new Error('INVALID_CREDENTIALS: salah'));
            await authController.login(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus meneruskan error non-kredensial ke next', async () => {
            mockReq.body = { username: 'admin_pt', password: 'pass' };
            const dbError = new Error('Database connection failed');
            authService.loginUser.mockRejectedValue(dbError);
            await authController.login(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(dbError);
        });
    });

    describe('saveOrUpdateUser()', () => {
        it('harus menolak jika bukan ADMIN_PT', async () => {
            mockReq.tenant.role = 'SATKER_PN';
            await authController.saveOrUpdateUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus membuat user baru jika tidak ada id', async () => {
            mockReq.body = { username: 'new_user', password: 'pass123', role: 'SATKER_PN' };
            authService.createUser.mockResolvedValue();
            await authController.saveOrUpdateUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            // Controller mengirim (actor, userData) — actor adalah req.tenant
            expect(authService.createUser).toHaveBeenCalledWith(
                mockReq.tenant,
                expect.objectContaining({ username: 'new_user' })
            );
        });

        it('harus memperbarui user jika ada id', async () => {
            mockReq.body = { id: 5, username: 'updated_user', role: 'SATKER_PN' };
            authService.updateUser.mockResolvedValue();
            await authController.saveOrUpdateUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            // Controller mengirim (actor, id, userData) — actor adalah req.tenant
            expect(authService.updateUser).toHaveBeenCalledWith(
                mockReq.tenant,
                5,
                expect.objectContaining({ username: 'updated_user' })
            );
        });

        it('harus meneruskan error ke next', async () => {
            mockReq.body = { username: 'test' };
            authService.createUser.mockRejectedValue(new Error('DB error'));
            await authController.saveOrUpdateUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('getAllUsers()', () => {
        it('harus menolak jika bukan ADMIN_PT', async () => {
            mockReq.tenant.role = 'PIMPINAN';
            await authController.getAllUsers(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus mengembalikan daftar user sebagai Admin', async () => {
            authService.getAllUsers.mockResolvedValue([{ id: 1, username: 'user1' }]);
            await authController.getAllUsers(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('deleteUser()', () => {
        it('harus menolak jika bukan ADMIN_PT', async () => {
            mockReq.tenant.role = 'SATKER_PN';
            mockReq.params.id = 5;
            await authController.deleteUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus menghapus user sebagai Admin', async () => {
            mockReq.params.id = 5;
            authService.deleteUser.mockResolvedValue();
            await authController.deleteUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            // Controller mengirim (actor, id) — actor adalah req.tenant
            expect(authService.deleteUser).toHaveBeenCalledWith(mockReq.tenant, 5);
        });

        it('harus meneruskan error ke next', async () => {
            mockReq.params.id = 5;
            authService.deleteUser.mockRejectedValue(new Error('Not found'));
            await authController.deleteUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('resetPassword()', () => {
        it('harus menolak jika bukan ADMIN_PT', async () => {
            mockReq.tenant.role = 'SATKER_PN';
            mockReq.params.id = 5;
            await authController.resetPassword(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus mereset password ke default', async () => {
            mockReq.params.id = 5;
            authService.updateUser.mockResolvedValue();
            await authController.resetPassword(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            // Controller mengirim (actor, id, payload) — actor adalah req.tenant
            expect(authService.updateUser).toHaveBeenCalledWith(
                mockReq.tenant,
                5,
                { password: 'password123' }
            );
        });

        it('harus meneruskan error ke next', async () => {
            mockReq.params.id = 5;
            authService.updateUser.mockRejectedValue(new Error('DB error'));
            await authController.resetPassword(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('forgotPassword()', () => {
        it('harus menolak jika username kosong', async () => {
            mockReq.body = {};
            await authController.forgotPassword(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus berhasil memanggil authService.forgotPassword', async () => {
            mockReq.body = { username: 'test_user' };
            authService.forgotPassword.mockResolvedValue({ message: 'Success' });
            await authController.forgotPassword(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Success' }));
        });

        it('harus meneruskan error ke next', async () => {
            mockReq.body = { username: 'test_user' };
            authService.forgotPassword.mockRejectedValue(new AppError('Error'));
            await authController.forgotPassword(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });
    });

    describe('resetPasswordWithToken()', () => {
        it('harus menolak jika token atau newPassword kosong', async () => {
            mockReq.body = {};
            await authController.resetPasswordWithToken(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus menolak jika newPassword kurang dari 6 karakter', async () => {
            mockReq.body = { token: 'abc', newPassword: '123' };
            await authController.resetPasswordWithToken(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('harus berhasil mereset password dengan token', async () => {
            mockReq.body = { token: 'abc', newPassword: 'newpass123' };
            authService.resetPasswordWithToken.mockResolvedValue();
            await authController.resetPasswordWithToken(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('harus meneruskan error ke next', async () => {
            mockReq.body = { token: 'abc', newPassword: 'newpass123' };
            authService.resetPasswordWithToken.mockRejectedValue(new AppError('Invalid token'));
            await authController.resetPasswordWithToken(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });
    });
});
