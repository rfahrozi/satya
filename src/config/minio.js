/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Object Storage Configuration
 * Menggunakan MinIO untuk penyimpanan dokumen PDF/Excel secara aman
 */

const Minio = require('minio');
const CircuitBreaker = require('opossum');
require('dotenv').config();

// Inisialisasi Client MinIO
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true', // Set true jika sudah menggunakan HTTPS/SSL
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});

// Nama Bucket dari file .env
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'satya-documents';

// [SRE-04] Opossum Circuit Breaker untuk fungsi upload MinIO
// Mencegah server Node.js crash/hang ketika storage sedang down
const minioBreakerOptions = {
    timeout: 10000,           // Jika 10 detik file belum berhasil terunggah, anggap gagal (timeout)
    errorThresholdPercentage: 50, // Jika 50% request gagal, sirkuit terbuka (Open)
    resetTimeout: 30000       // Tunggu 30 detik sebelum mencoba menyambungkan ulang (Half-Open)
};

// Bungkus fungsi putObject ke dalam promise agar didukung oleh Circuit Breaker
const asyncPutObject = async (bucketName, objectName, stream, size, metaData) => {
    return minioClient.putObject(bucketName, objectName, stream, size, metaData);
};

const minioUploadBreaker = new CircuitBreaker(asyncPutObject, minioBreakerOptions);
minioUploadBreaker.fallback((bucketName, objectName, stream, size, metaData, error) => {
    const fallbackError = new Error(`Sistem Storage (MinIO) sedang mengalami gangguan atau Timeout (${error.message}). Harap coba unggah dokumen Anda beberapa saat lagi.`);
    fallbackError.statusCode = 503;
    throw fallbackError;
});

/**
 * Fungsi untuk memastikan Bucket sudah tersedia di server MinIO.
 * Dijalankan satu kali saat aplikasi startup.
 */
async function initMinio() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (exists) {
            console.log(`✅ [MinIO] Bucket '${BUCKET_NAME}' tersedia.`);
        } else {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            console.log(`🚀 [MinIO] Bucket '${BUCKET_NAME}' berhasil dibuat otomatis.`);
        }

        // Opsional: Set Policy ke Private agar file tidak bisa diakses publik tanpa Presigned URL
        // Secara default, MinIO bucket baru bersifat private.
    } catch (error) {
        console.error('❌ [MinIO] Gagal inisialisasi MinIO:', error.message);
        // Jangan hentikan aplikasi di mode testing
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
    }
}

module.exports = {
    minioClient,
    minioUploadBreaker,
    initMinio,
    BUCKET_NAME
};