/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Scheduler (Cron Job)
 * Menjalankan tugas pengecekan dan pengiriman reminder secara terjadwal.
 */
const cron = require('node-cron');
const reportRepo = require('./repositories/reportRepo');
const { emailQueue } = require('./emailWorker'); // ← Fix: path yang benar

// Hari deadline dapat dikonfigurasi via env var. Default: tanggal 10 bulan berikutnya.
const DEADLINE_DAY = parseInt(process.env.DEADLINE_DAY) || 10;

console.log(`⏰ Scheduler Pengingat Otomatis diaktifkan. Deadline hari ke-${DEADLINE_DAY}.`);

/**
 * Pure function: Mengecek apakah hari ini adalah hari pengiriman reminder.
 * Diekspor untuk keperluan unit testing tanpa mocking cron.
 *
 * @param {Date} today - Tanggal yang dicek
 * @param {number} deadlineDay - Hari deadline dalam sebulan
 * @returns {boolean}
 */
function isReminderDay(today, deadlineDay) {
    const currentDay = today.getDate();
    const targetDays = [deadlineDay - 3, deadlineDay - 1, deadlineDay];
    return targetDays.includes(currentDay);
}

// Jadwal berjalan setiap hari jam 8:00 pagi Waktu Indonesia Barat
cron.schedule('0 8 * * *', async () => {
    console.log(`\n[${new Date().toISOString()}] --- Menjalankan Pengecekan Reminder Harian ---`);

    const today = new Date();

    if (!isReminderDay(today, DEADLINE_DAY)) {
        console.log('Hari ini bukan jadwal pengiriman reminder. Pengecekan selesai.');
        return;
    }

    // Tentukan periode laporan yang dicek (selalu bulan sebelumnya dari bulan berjalan)
    const targetDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const periodeBulan = targetDate.getMonth() + 1;
    const periodeTahun = targetDate.getFullYear();

    const deadlineText = `${DEADLINE_DAY} ${targetDate.toLocaleString('id-ID', { month: 'long' })} ${periodeTahun}`;
    console.log(`Mengecek kelengkapan laporan untuk periode: ${periodeBulan}-${periodeTahun}. Deadline: ${deadlineText}`);

    try {
        const totalWajib = await reportRepo.getTotalReportTypes();
        if (totalWajib === 0) {
            console.log('Tidak ada tipe laporan yang terdaftar. Reminder tidak dijalankan.');
            return;
        }

        const satkersToRemind = await reportRepo.findSatkersForReminder('monthly', periodeBulan, periodeTahun);

        if (satkersToRemind.length === 0) {
            console.log('✅ Semua satker telah melengkapi laporan. Tidak ada reminder yang dikirim.');
            return;
        }

        console.log(`🚨 Ditemukan ${satkersToRemind.length} satker yang belum lengkap. Menambahkan ke antrean email...`);

        // Gunakan addBulk agar semua job dikirim ke Redis dalam satu operasi (lebih efisien)
        const jobs = satkersToRemind.map((satker) => ({
            name: 'sendReminderEmail',
            data: {
                to: satker.email,
                nama_satker: satker.nama_satker,
                deadline_text: deadlineText
            },
            opts: {
                // Mencegah duplikasi job jika scheduler berjalan lebih dari sekali di hari yang sama
                jobId: `reminder-${satker.id}-${periodeBulan}-${periodeTahun}`
            }
        }));

        await emailQueue.addBulk(jobs);
        satkersToRemind.forEach(s => console.log(`   -> Job reminder untuk ${s.nama_satker} (${s.email}) ditambahkan.`));

    } catch (error) {
        console.error('❌ Terjadi kesalahan saat menjalankan scheduler reminder:', error);
    }
    console.log('--- Pengecekan Reminder Harian Selesai ---');
}, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
});

module.exports = { isReminderDay };