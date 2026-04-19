/**
 * Unit Test: Auth Service
 * Menguji fungsi generateToken dan verifyToken secara terisolasi
 * tanpa dependency ke database
 */

// Atur JWT_SECRET untuk test environment
process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';
process.env.JWT_EXPIRES_IN = '1h';

const { generateToken, verifyToken } = require('../../src/services/authService');
const jwt = require('jsonwebtoken');
const { AppError } = require('../../src/middlewares/errorHandler');

describe('Unit Test: authService', () => {

    describe('generateToken()', () => {
        const mockUser = {
            id: 10,
            role: 'SATKER_PN',
            satker_id: 2
        };

        it('harus menghasilkan string token JWT yang valid', () => {
            const token = generateToken(mockUser);
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
        });

        it('harus menyertakan payload yang benar di dalam token', () => {
            const token = generateToken(mockUser);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            expect(decoded.id).toBe(10);
            expect(decoded.role).toBe('SATKER_PN');
            expect(decoded.satkerId).toBe(2);
        });

        it('harus menghasilkan token yang berbeda untuk user yang berbeda', () => {
            const mockUser2 = { id: 20, role: 'ADMIN_PT', satker_id: null };
            const token1 = generateToken(mockUser);
            const token2 = generateToken(mockUser2);

            expect(token1).not.toBe(token2);
        });
    });

    describe('verifyToken()', () => {
        it('harus berhasil memverifikasi token yang valid', () => {
            const mockUser = { id: 5, role: 'ADMIN_PT', satker_id: null };
            const token = generateToken(mockUser);
            const decoded = verifyToken(token);

            expect(decoded.id).toBe(5);
            expect(decoded.role).toBe('ADMIN_PT');
        });

        it('harus melempar AppError untuk token palsu', () => {
            expect(() => {
                verifyToken('ini.token.palsu');
            }).toThrow();
        });

        it('harus melempar AppError untuk token yang kadaluwarsa', () => {
            // Buat token yang sudah expired
            const expiredToken = jwt.sign(
                { id: 1, role: 'TEST' },
                process.env.JWT_SECRET,
                { expiresIn: '0s' } // langsung expired
            );

            // Tunggu sebentar agar benar-benar expired
            expect(() => {
                verifyToken(expiredToken);
            }).toThrow();
        });
    });

    describe('AppError Class', () => {
        it('harus membuat error dengan statusCode dan status yang tepat (4xx = fail)', () => {
            const err = new AppError('Not Found', 404);
            expect(err.message).toBe('Not Found');
            expect(err.statusCode).toBe(404);
            expect(err.status).toBe('fail');
            expect(err.isOperational).toBe(true);
        });

        it('harus membuat error dengan status "error" untuk 5xx', () => {
            const err = new AppError('Internal Error', 500);
            expect(err.statusCode).toBe(500);
            expect(err.status).toBe('error');
        });
    });
});
