/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Auth Routes
 * Jalur akses untuk Autentikasi dan Manajemen Akun
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const tenantContext = require('../middlewares/tenant');

/**
 * Rate limiter untuk endpoint login.
 * Membatasi percobaan login untuk mencegah brute force attack.
 * Dinonaktifkan di mode test agar tidak mengganggu test suite.
 */
const loginLimiter = process.env.NODE_ENV !== 'test'
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // Window 15 menit
        max: 20,                   // Maksimal 20 percobaan per IP per 15 menit
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            status: 'fail',
            message: 'Terlalu banyak percobaan login dari IP ini. Silakan coba lagi setelah 15 menit.'
        }
    })
    : (req, res, next) => next(); // No-op di mode test

/**
 * RUTE PUBLIK
 */
// Endpoint untuk login (Mendapatkan Token JWT) — dilindungi rate limiter
router.post('/login', loginLimiter, authController.login);

/**
 * RUTE TERPROTEKSI (Memerlukan Token)
 */
router.use(tenantContext);

// [ADMIN] Ambil semua daftar user (Hanya Admin PT)
router.get('/users', authController.getAllUsers);

// [ADMIN] Simpan atau Update akun Satker (Hanya Admin PT)
router.post('/users', authController.saveOrUpdateUser);

// [ADMIN] Hapus atau nonaktifkan akun Satker (Hanya Admin PT)
router.delete('/users/:id', authController.deleteUser);

// [ADMIN] Reset password akun (Hanya Admin PT)
router.post('/users/:id/reset-password', authController.resetPassword);

module.exports = router;