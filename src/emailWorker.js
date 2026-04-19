/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Email Worker
 * Mengelola antrean dan pemrosesan pengiriman email notifikasi
 */

const { Queue, Worker } = require('bullmq');
const redisConnection = require('./config/redis');
const { sendRevisionEmail, sendReminderEmail } = require('./services/emailService');

// 1. Definisikan Nama Antrean
const QUEUE_NAME = 'email-notifications';

// 2. Inisialisasi Queue (Digunakan oleh Service untuk menambah tugas)
const emailQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection
});

// 3. Inisialisasi Worker (Digunakan oleh worker-app.js untuk memproses tugas)
const emailWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
        console.log(`📩 [Worker] Memproses Job ID ${job.id} dengan nama '${job.name}'...`);

        switch (job.name) {
            case 'sendRevisionEmail':
                const { to, nama_laporan, catatan_admin } = job.data;
                console.log(`   -> Mengirim email revisi ke ${to}`);
                await sendRevisionEmail(to, { nama_laporan, catatan_admin });
                break;
            
            case 'sendReminderEmail':
                const { to: reminderTo, nama_satker, deadline_text } = job.data;
                console.log(`   -> Mengirim email pengingat ke ${reminderTo}`);
                await sendReminderEmail(reminderTo, { nama_satker, deadline_text });
                break;
            
            default:
                throw new Error(`Tipe job tidak dikenal: ${job.name}`);
        }
    },
    {
        connection: redisConnection,
        // Membatasi jumlah tugas yang diproses secara bersamaan (concurrency)
        concurrency: 5,
        // Strategi percobaan ulang jika gagal
        settings: {
            backoff: {
                type: 'exponential',
                delay: 10000 // Coba lagi mulai dari 10 detik jika gagal
            }
        }
    }
);

/**
 * Pengaturan Global: Membersihkan job yang sudah selesai secara otomatis
 * agar Redis tidak penuh dengan data historis
 */
emailWorker.on('completed', async (job) => {
    // Opsional: Hapus job dari Redis setelah berhasil diselesaikan
    // await job.remove();
});

module.exports = {
    emailQueue,
    emailWorker
};