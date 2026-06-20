/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Global Error Handler
 * Menstandarisasi respon error di seluruh API
 */

/**
 * Custom Error Class untuk operasional error
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware Utama Penanganan Error
 */
const errorHandler = (err, req, res, next) => {
    // Tangani error multer secara spesifik
    if (err.name === 'MulterError' && err.message === 'File too large') {
        err.statusCode = 400;
        err.message = 'Ukuran file tidak boleh melebihi 5MB';
    }

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error untuk kebutuhan debugging di server (Internal)
    if (process.env.NODE_ENV !== 'test') {
        console.error('⚠️ [ERROR LOG]:', {
            message: err.message,
            stack: err.stack,
            path: req.originalUrl
        });
    }

    // Response ke Client
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message || 'Terjadi kesalahan internal pada server.',
        // Hanya tampilkan stack trace jika di mode development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Handler khusus untuk rute yang tidak ditemukan (404)
 */
const notFoundHandler = (req, res, next) => {
    next(new AppError(`Tidak dapat menemukan ${req.originalUrl} di server ini!`, 404));
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler
};