/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Object Storage Configuration
 * Menggunakan MinIO untuk penyimpanan dokumen PDF/Excel secara aman
 */

const Minio = require('minio');
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
    initMinio,
    BUCKET_NAME
};