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

// Jalur Manajemen Data Master
const masterRoutes = require('./masterRoutes');
router.use('/master', masterRoutes);

// Jalur Notifikasi
const notificationRoutes = require('./notificationRoutes');
router.use('/notifications', notificationRoutes);

// Jalur Internal Monitoring
// Jangan register modul internal sampai seluruh dependency tersedia.
if (process.env.PT_INTERNAL_MONITORING_ENABLED === 'true') {
  const internalMonitoringRoutes = require('./internalMonitoringRoutes');
  router.use('/internal-monitoring', internalMonitoringRoutes);
}

/**
 * Health Check Endpoint
 * Digunakan untuk memonitor uptime & APM (OPS-01)
 */
const knex = require('../config/knex');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Mengecek status kesehatan layanan API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server beroperasi normal
 */
router.get('/health', async (req, res) => {
    let dbStatus = 'ok';
    try {
        await knex.raw('SELECT 1');
    } catch (err) {
        dbStatus = 'error';
    }

    const isHealthy = dbStatus === 'ok';

    res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? 'SATYA API is healthy and operational.' : 'SATYA API is experiencing issues.',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        dependencies: {
            database: dbStatus
        }
    });
});

/**
 * [SRE-06] Prometheus Metrics Endpoint
 */
const promClient = require('prom-client');
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics(); // Aktifkan metrik RAM, CPU, dan Event Loop default Node.js

router.get('/metrics', async (req, res, next) => {
    // Tambahkan basic security untuk endpoint metrics agar tidak bocor
    const authHeader = req.headers['authorization'];
    const metricsToken = process.env.METRICS_TOKEN || 'dev-metrics-token-123';

    // Format: "Bearer <token>"
    if (process.env.NODE_ENV === 'production') {
        if (!authHeader || !authHeader.includes(metricsToken)) {
            return res.status(403).json({ error: 'Forbidden access to metrics' });
        }
    }

    try {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
    } catch (error) {
        next(error);
    }
});

/**
 * Handle rute yang tidak terdaftar (Fallback 404)
 */
router.all('*', notFoundHandler);

module.exports = router;