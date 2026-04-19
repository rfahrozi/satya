/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Master Route Hub
 * Menggabungkan seluruh modul rute ke dalam satu titik akses API v1
 */

const express = require('express');
const router = express.Router();

// Import Sub-Rute
const authRoutes = require('./authRoutes');
const reportRoutes = require('./reportRoutes');
const { notFoundHandler } = require('../middlewares/errorHandler');

/**
 * Registrasi Modul Rute
 */

// Jalur Autentikasi dan Manajemen User (Login, CRUD User)
router.use('/auth', authRoutes);

// Jalur Operasional Pelaporan (Upload, Progress, Verifikasi, Dashboard)
router.use('/reports', reportRoutes);

/**
 * Health Check Endpoint
 * Digunakan untuk memonitor apakah API berjalan (Uptime Monitoring)
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'SATYA API PT KEPRI is healthy and operational.',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

/**
 * Handle rute yang tidak terdaftar (Fallback 404)
 */
router.all('*', notFoundHandler);

module.exports = router;