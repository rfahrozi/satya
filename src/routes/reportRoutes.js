/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Report Routes
 * Jalur akses untuk Manajemen Dokumen, Verifikasi, dan Dashboard
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const path = require('path');
const rateLimit = require('express-rate-limit');
const reportController = require('../controllers/reportController');
const tenantContext = require('../middlewares/tenant');
const { AppError } = require('../middlewares/errorHandler');

// Limit upload maksimal 10x per menit per satker/IP
const uploadRateLimiter = process.env.NODE_ENV !== 'test'
    ? rateLimit({
        windowMs: 60 * 1000, // 1 menit
        max: 10,
        message: {
            success: false,
            message: 'Terlalu banyak permintaan unggah dari akun Anda. Silakan coba lagi setelah 1 menit.'
        }
    })
    : (req, res, next) => next();

// [SRE-01] Ganti memoryStorage dengan diskStorage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, os.tmpdir());
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Konfigurasi Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Batas maksimal 10MB per file
    fileFilter: (req, file, cb) => {
        // Validasi tipe file: Hanya PDF dan Excel (.xlsx) / Word (.docx)
        if (
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            cb(null, true);
        } else {
            cb(new AppError('Format file tidak didukung. Gunakan PDF, XLSX, XLS, DOC, atau DOCX.', 400), false);
        }
    }
});

/**
 * Wrapper Multer dengan penanganan error yang benar.
 * Memastikan error dari fileFilter menghasilkan 400 (bukan 500).
 */
function uploadMultiple(fields) {
    return (req, res, next) => {
        upload.fields(fields)(req, res, (err) => {
            if (err) {
                // Error dari fileFilter (format tidak valid) atau MulterError (ukuran)
                const statusCode = err.statusCode || 400;
                return next(new AppError(err.message, statusCode));
            }
            next();
        });
    };
}

/**
 * SEMUA RUTE DI BAWAH INI MEMERLUKAN LOGIN (JWT)
 */
router.use(tenantContext);

// --- RUTE KHUSUS SATKER PN ---

// Upload atau Timpa Laporan — dilindungi rate limiter
router.post('/upload', uploadRateLimiter, uploadMultiple([{ name: 'dokumen_monev', maxCount: 1 }, { name: 'dokumen_excel', maxCount: 1 }]), reportController.uploadReport);

// Ambil progress laporan milik satker sendiri
router.get('/my-progress', reportController.getMyProgress);


// --- RUTE KHUSUS ADMIN & PIMPINAN ---

// Dashboard Agregat (Digunakan Admin dan Pimpinan)
router.get('/dashboard-agregat', reportController.getDashboardAgregat);

// Dashboard Heatmap Kepatuhan 12 Bulan (Admin & Pimpinan)
router.get('/dashboard-heatmap', reportController.getDashboardHeatmap);

// Export data agregat ke Excel
router.get('/export-agregat', reportController.exportDashboardAgregat);

// Admin Stats: Antrian verifikasi, loop revisi, ketepatan waktu, aktivitas terbaru
router.get('/admin-stats', reportController.getAdminStats);

// Queue Status: Status job BullMQ email (waiting, active, failed)
router.get('/queue-status', reportController.getQueueStatus);


// --- RUTE DENGAN PARAMETER :id (harus setelah rute statis) ---

// Proxy untuk download file MinIO
router.get('/proxy', reportController.proxyMinioFile);

// Mendapatkan histori revisi dokumen (Feature B)
router.get('/:id/history', reportController.getSubmissionHistory);

// Verifikasi Laporan (Hanya Admin PT)
router.patch('/:id/verify', reportController.verifyReport);

// Mendapatkan Presigned URL untuk Preview/Download versi terbaru
router.get('/:id/download', reportController.getDownloadUrl);

// Mendapatkan Presigned URL untuk Preview/Download versi riwayat
router.get('/history/:id/download', reportController.downloadHistoryFile);

// Hapus laporan milik sendiri (Full CRUD - Delete)
router.delete('/:id', reportController.deleteReport);

module.exports = router;