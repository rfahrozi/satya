/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Report Routes
 * Jalur akses untuk Manajemen Dokumen, Verifikasi, dan Dashboard
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const reportController = require('../controllers/reportController');
const tenantContext = require('../middlewares/tenant');
const { AppError } = require('../middlewares/errorHandler');

// Konfigurasi Multer (Penyimpanan Sementara di RAM)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Batas maksimal 10MB per file
    fileFilter: (req, file, cb) => {
        // Validasi tipe file: Hanya PDF dan Excel (.xlsx)
        if (
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) {
            cb(null, true);
        } else {
            cb(new AppError('Format file tidak didukung. Gunakan PDF atau XLSX.', 400), false);
        }
    }
});

/**
 * Wrapper Multer dengan penanganan error yang benar.
 * Memastikan error dari fileFilter menghasilkan 400 (bukan 500).
 */
function uploadSingle(fieldName) {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
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

// Upload atau Timpa Laporan
router.post('/upload', uploadSingle('dokumen_monev'), reportController.uploadReport);

// Ambil progress laporan milik satker sendiri
router.get('/my-progress', reportController.getMyProgress);

// Hapus laporan milik sendiri (Full CRUD - Delete)
router.delete('/:id', reportController.deleteReport);


// --- RUTE KHUSUS ADMIN & PIMPINAN ---

// Dashboard Agregat (Digunakan Admin dan Pimpinan)
router.get('/dashboard-agregat', reportController.getDashboardAgregat);

// Verifikasi Laporan (Hanya Admin PT)
router.patch('/:id/verify', reportController.verifyReport);


// --- RUTE UMUM (Terproteksi) ---

// Mendapatkan Presigned URL untuk Preview/Download
router.get('/:id/download', reportController.getDownloadUrl);

module.exports = router;