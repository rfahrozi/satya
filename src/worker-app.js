/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Worker & Scheduler Entry Point
 * Jalankan file ini secara terpisah dari API utama untuk memproses tugas background.
 * Command: node src/worker-app.js
 */
require('dotenv').config();

// 1. Jalankan Scheduler untuk pengecekan reminder otomatis
require('./scheduler');

// 2. Mulai Worker untuk memproses antrean email dari Redis
const { emailWorker } = require('./workers/emailWorker');

console.log('🚀 Worker process started. Menunggu jobs dari Redis...');

emailWorker.on('failed', (job, err) => console.error(`[WORKER FAILED] Job ${job.id} (${job.name}) gagal: ${err.message}`));
emailWorker.on('completed', (job) => console.log(`[WORKER SUCCESS] Job ${job.id} (${job.name}) telah selesai.`));