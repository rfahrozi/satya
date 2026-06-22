/**
 * Unit Test: Auth Service - Business Logic
 * Menguji createUser, updateUser, getAllUsers, deleteUser dengan mocked database
 */

process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';
process.env.JWT_EXPIRES_IN = '1h';

// Mock knex at the module level
jest.mock('../../src/config/knex', () => {
    const mockDb = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        first: jest.fn(),
        insert: jest.fn().mockResolvedValue([1]),
        update: jest.fn().mockResolvedValue(1),
        del: jest.fn().mockResolvedValue(1),
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockResolvedValue([]),
    });
    return mockDb;
});

const authService = require('../../src/services/authService');
const knex = require('../../src/config/knex');
const bcrypt = require('bcryptjs');

describe('Unit Test: authService - Business Logic', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loginUser()', () => {
        it('harus melempar error jika user tidak ditemukan', async () => {
            // Mock chain: knex('users').where({ username }).andWhere('is_active', true).first()
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue(null),
            };
            knex.mockReturnValue(mockChain);

            await expect(authService.loginUser('nonexistent', 'pass')).rejects.toThrow('INVALID_CREDENTIALS');
        });

        it('harus melempar error jika password salah', async () => {
            const hashedPassword = await bcrypt.hash('correct_password', 10);
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue({
                    id: 1,
                    username: 'testuser',
                    role: 'SATKER_PN',
                    satker_id: 1,
                    password_hash: hashedPassword,
                }),
            };
            knex.mockReturnValue(mockChain);

            await expect(authService.loginUser('testuser', 'wrong_password')).rejects.toThrow('INVALID_CREDENTIALS');
        });

        it('harus mengembalikan token dan user data saat login berhasil', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue({
                    id: 1,
                    username: 'testuser',
                    role: 'SATKER_PN',
                    satker_id: 2,
                    password_hash: hashedPassword,
                }),
            };
            knex.mockReturnValue(mockChain);

            const result = await authService.loginUser('testuser', 'password123');
            expect(result.token).toBeDefined();
            expect(result.user.id).toBe(1);
            expect(result.user.role).toBe('SATKER_PN');
            expect(result.user.satkerId).toBe(2);
        });
    });

    describe('createUser()', () => {
        it('harus membuat user dengan password yang di-hash', async () => {
            const mockChain = { insert: jest.fn().mockResolvedValue([1]) };
            knex.mockReturnValue(mockChain);

            await authService.createUser({
                username: 'new_user',
                password: 'password123',
                role: 'SATKER_PN',
                satker_id: 1,
                email: 'test@test.com',
            });

            expect(mockChain.insert).toHaveBeenCalledTimes(1);
            const insertArg = mockChain.insert.mock.calls[0][0];
            expect(insertArg.username).toBe('new_user');
            expect(insertArg.password_hash).toBeDefined();
            expect(insertArg.password_hash).not.toBe('password123'); // harus di-hash
        });

        it('harus menolak jika password kosong', async () => {
            await expect(authService.createUser({ username: 'test' })).rejects.toThrow('Password wajib diisi');
        });

        it('harus menolak jika password hanya whitespace', async () => {
            await expect(authService.createUser({ username: 'test', password: '   ' })).rejects.toThrow('Password wajib diisi');
        });
    });

    describe('updateUser()', () => {
        it('harus memperbarui user tanpa mengubah password jika tidak dikirim', async () => {
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                update: jest.fn().mockResolvedValue(1),
            };
            knex.mockReturnValue(mockChain);

            await authService.updateUser(5, {
                username: 'updated',
                role: 'SATKER_PN',
                satker_id: 1,
            });

            expect(mockChain.update).toHaveBeenCalledTimes(1);
            const updateArg = mockChain.update.mock.calls[0][0];
            expect(updateArg.username).toBe('updated');
            expect(updateArg.password_hash).toBeUndefined(); // tidak boleh di-set
        });

        it('harus memperbarui password jika dikirim', async () => {
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                update: jest.fn().mockResolvedValue(1),
            };
            knex.mockReturnValue(mockChain);

            await authService.updateUser(5, {
                username: 'updated',
                password: 'newpassword',
                role: 'SATKER_PN',
            });

            const updateArg = mockChain.update.mock.calls[0][0];
            expect(updateArg.password_hash).toBeDefined();
            expect(updateArg.password_hash).not.toBe('newpassword');
        });
    });

    describe('getAllUsers()', () => {
        it('harus mengembalikan daftar user non-admin', async () => {
            const mockChain = {
                leftJoin: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                whereNot: jest.fn().mockResolvedValue([
                    { id: 1, username: 'pn_tpi', role: 'SATKER_PN' },
                ]),
            };
            knex.mockReturnValue(mockChain);

            const result = await authService.getAllUsers();
            expect(Array.isArray(result)).toBe(true);
            expect(mockChain.whereNot).toHaveBeenCalledWith('users.role', 'ADMIN_PT');
        });
    });

    describe('deleteUser()', () => {
        it('harus menghapus user berdasarkan ID', async () => {
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                del: jest.fn().mockResolvedValue(1),
            };
            knex.mockReturnValue(mockChain);

            await authService.deleteUser(5);
            expect(mockChain.where).toHaveBeenCalledWith({ id: 5 });
            expect(mockChain.del).toHaveBeenCalledTimes(1);
        });
    });

    describe('forgotPassword()', () => {
        const { emailQueue } = require('../../src/emailWorker');
        
        beforeAll(() => {
            jest.mock('../../src/emailWorker', () => ({
                emailQueue: { add: jest.fn().mockResolvedValue() }
            }));
        });

        it('harus melempar error jika user tidak ditemukan', async () => {
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue(null)
            };
            knex.mockReturnValue(mockChain);

            await expect(authService.forgotPassword('nonexistent')).rejects.toThrow('tidak ditemukan');
        });

        it('harus melempar error jika user tidak memiliki email', async () => {
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue({ id: 1, email: null })
            };
            knex.mockReturnValue(mockChain);

            await expect(authService.forgotPassword('noemail')).rejects.toThrow('belum memiliki alamat email');
        });
    });

    describe('resetPasswordWithToken()', () => {
        it('harus melempar error jika token tidak valid atau expired', async () => {
            const mockChain = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue(null)
            };
            knex.mockReturnValue(mockChain);

            await expect(authService.resetPasswordWithToken('invalid_token', 'newpass')).rejects.toThrow('tidak valid');
        });
    });
});
