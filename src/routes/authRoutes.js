/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Auth Routes
 * Jalur akses untuk Autentikasi dan Manajemen Akun
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const tenantContext = require('../middlewares/tenant');

// Helper: buat rate limiter atau no-op di mode test
const makeRateLimiter = (opts) =>
    process.env.NODE_ENV !== 'test'
        ? rateLimit({ standardHeaders: true, legacyHeaders: false, ...opts })
        : (req, res, next) => next();

/**
 * [SEC-05] Rate limiter untuk endpoint publik yang rentan abuse.
 *
 * loginLimiter      — brute-force protection: 10 percobaan / 15 menit
 * passwordLimiter   — spam & enumerasi: 5 permintaan / 30 menit
 *   berlaku untuk /forgot-password (spam email) dan /reset-password (token exhaustion)
 */
const loginLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 10,                   // Dikurangi dari 20 → 10 (lebih ketat untuk brute-force)
    message: {
        success: false,
        status: 'fail',
        message: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.'
    }
});

const passwordLimiter = makeRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 menit
    max: 5,                    // Sangat ketat — 5 permintaan reset per 30 menit per IP
    message: {
        success: false,
        status: 'fail',
        message: 'Terlalu banyak permintaan reset password. Silakan coba lagi setelah 30 menit.'
    }
});

/**
 * RUTE PUBLIK
 */
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login pengguna dan dapatkan token JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: Kredensial tidak valid
 */
router.post('/login', loginLimiter, authController.login);

// Lupa Password — dilindungi spam/enumerasi limiter
router.post('/forgot-password', passwordLimiter, authController.forgotPassword);

// Reset Password via token — dilindungi token exhaustion limiter
router.post('/reset-password', passwordLimiter, authController.resetPasswordWithToken);

/**
 * RUTE TERPROTEKSI (Memerlukan Token)
 */
router.use(tenantContext);

// [SEC-L01] Endpoint Logout: Revoke JWT Token ke Redis Blacklist
router.post('/logout', authController.logout);

// [ADMIN] Ambil semua daftar user (Hanya Admin PT)
router.get('/users', authController.getAllUsers);

// [ADMIN] Simpan atau Update akun Satker (Hanya Admin PT)
router.post('/users', authController.saveOrUpdateUser);

// [ADMIN] Hapus atau nonaktifkan akun Satker (Hanya Admin PT)
router.delete('/users/:id', authController.deleteUser);

// [ADMIN] Reset password akun (Hanya Admin PT)
router.post('/users/:id/reset-password', authController.resetPassword);

module.exports = router;