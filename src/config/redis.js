/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Redis Configuration
 * Digunakan sebagai backend untuk antrean BullMQ (Email & Scheduler)
 */

const Redis = require('ioredis');
require('dotenv').config();

// Konfigurasi koneksi Redis
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    
    // Syarat wajib untuk BullMQ:
    // Mencegah error 'Max retries per request' yang sering terjadi pada background worker
    maxRetriesPerRequest: null,
    
    // Memastikan koneksi tetap hidup
    keepAlive: 10000,
    
    // Logika Reconnect jika server Redis sempat mati
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
};

// Buat instance koneksi tunggal (Singleton)
const redisConnection = new Redis(redisConfig);

// Event Listener untuk memantau kesehatan koneksi
redisConnection.on('connect', () => {
    console.log('✅ [Redis] Berhasil terhubung ke server.');
});

redisConnection.on('error', (err) => {
    console.error('❌ [Redis] Error koneksi:', err.message);
    
    // Jangan hentikan aplikasi di mode testing agar Jest tetap jalan
    if (process.env.NODE_ENV !== 'test') {
        // process.exit(1); // Opsional: Aktifkan jika aplikasi tidak boleh jalan tanpa Redis
    }
});

module.exports = redisConnection;