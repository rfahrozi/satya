'use strict';
/**
 * SATYA - Global Error Handler
 * Menstandarisasi respon error di seluruh API
 */

const logger = require('../config/logger');

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
 * [LOG-01] Menggunakan Winston structured logger — tidak ada lagi console.error
 * [TEST-01] Tidak ada lagi writeFileSync('debug_error.log') yang mencemari test
 */
const errorHandler = (err, req, res, next) => {
    // Tangani error multer secara spesifik
    if (err.name === 'MulterError' && err.message === 'File too large') {
        err.statusCode = 400;
        err.message = `Ukuran file melebihi batas maksimum (${Math.round((parseInt(process.env.MONITORING_UPLOAD_MAX_BYTES) || 10485760) / 1048576)}MB).`;
    }

    // Handle CORS error dari middleware cors()
    if (err.message && err.message.startsWith('CORS:')) {
        err.statusCode = 403;
    }

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log terstruktur — level berdasarkan tipe error
    // 5xx = error server (butuh investigasi), 4xx = fail client (informatif saja)
    const logPayload = {
        statusCode: err.statusCode,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        errorCode: err.code,
        message: err.message,
        ...(err.statusCode >= 500 && { stack: err.stack }),
    };

    if (err.statusCode >= 500) {
        logger.error('Server error', logPayload);
    } else if (err.statusCode >= 400) {
        logger.warn('Client error', logPayload);
    }

    // Response ke client — stack trace hanya di development
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message || 'Terjadi kesalahan internal pada server.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

/**
 * Handler untuk rute yang tidak ditemukan (404)
 */
const notFoundHandler = (req, res, next) => {
    next(new AppError(`Tidak dapat menemukan ${req.originalUrl} di server ini!`, 404));
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler
};
