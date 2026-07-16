/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Scheduler (Cron Job)
 * Menjalankan tugas pengecekan dan pengiriman reminder secara terjadwal berdasarkan deadline per dokumen.
 */
const cron = require('node-cron');
const reportRepo = require('./repositories/reportRepo');
const { emailQueue } = require('./emailWorker');

console.log('⏰ Scheduler Pengingat Otomatis diaktifkan. (Mode Periode Dinamis)');

function isReminderDay(currentDay, deadlineDay) {
    const targetDays = [deadlineDay - 3, deadlineDay - 1, deadlineDay];
    return targetDays.includes(currentDay);
}

// Mengembalikan array { periodUnit, periodeTahun } yang deadline-nya jatuh pada bulan ini
// Contoh: quarterly, bulan saat ini = 4 (April), berarti periodUnit = 1 (Q1), dan deadline nya adalah bulan ini
function getTargetPeriodsForCurrentMonth(periodType, currentMonth, currentYear) {
    const targets = [];
    if (periodType === 'monthly') {
        // Laporan bulanan untuk bulan sebelumnya, deadline di bulan saat ini
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const year = currentMonth === 1 ? currentYear - 1 : currentYear;
        targets.push({ periodUnit: prevMonth, periodeTahun: year });
    } else if (periodType === 'quarterly') {
        // Q1 (1,2,3) deadline di bulan 4
        if (currentMonth === 4) targets.push({ periodUnit: 1, periodeTahun: currentYear });
        // Q2 (4,5,6) deadline di bulan 7
        if (currentMonth === 7) targets.push({ periodUnit: 2, periodeTahun: currentYear });
        // Q3 (7,8,9) deadline di bulan 10
        if (currentMonth === 10) targets.push({ periodUnit: 3, periodeTahun: currentYear });
        // Q4 (10,11,12) deadline di bulan 1
        if (currentMonth === 1) targets.push({ periodUnit: 4, periodeTahun: currentYear - 1 });
    } else if (periodType === 'semesterly') {
        // S1 (1-6) deadline di bulan 7
        if (currentMonth === 7) targets.push({ periodUnit: 1, periodeTahun: currentYear });
        // S2 (7-12) deadline di bulan 1
        if (currentMonth === 1) targets.push({ periodUnit: 2, periodeTahun: currentYear - 1 });
    } else if (periodType === 'annually') {
        // Tahunan deadline di bulan 1 tahun berikutnya
        if (currentMonth === 1) targets.push({ periodUnit: 1, periodeTahun: currentYear - 1 });
    }
    return targets;
}

cron.schedule('0 8 * * *', async () => {
    console.log(`
[${new Date().toISOString()}] --- Menjalankan Pengecekan Reminder Harian ---`);
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    try {
        const configs = await reportRepo.getActiveDeadlineConfigs();
        
        let totalJobs = 0;
        
        for (const config of configs) {
            // Apakah hari ini H-3, H-1, atau H-0 dari deadline laporan ini?
            if (!isReminderDay(currentDay, config.day_of_period)) continue;
            
            // Cek apakah ada periode laporan ini yang deadline-nya jatuh di bulan ini
            const targetPeriods = getTargetPeriodsForCurrentMonth(config.period_type, currentMonth, currentYear);
            
            for (const target of targetPeriods) {
                const missingSatkers = await reportRepo.getMissingSubmissionsForReport(
                    config.report_type_id, 
                    config.period_type, 
                    target.periodUnit, 
                    target.periodeTahun
                );
                
                if (missingSatkers.length === 0) continue;
                
                const targetDateObj = new Date(currentYear, currentMonth - 1, config.day_of_period);
                const deadlineText = `${config.day_of_period} ${targetDateObj.toLocaleString('id-ID', { month: 'long' })} ${currentYear}`;
                
                const jobs = missingSatkers.map(satker => ({
                    name: 'sendReminderEmail',
                    data: {
                        to: satker.email,
                        nama_satker: satker.nama_satker,
                        deadline_text: deadlineText,
                        nama_laporan: config.nama_laporan // opsional: modifikasi worker untuk menerima ini
                    },
                    opts: {
                        jobId: `reminder-${satker.satker_id}-${config.report_type_id}-${config.period_type}-${target.periodUnit}-${target.periodeTahun}-${currentDay}`
                    }
                }));

                await emailQueue.addBulk(jobs);
                totalJobs += jobs.length;
                console.log(`   -> Ditambahkan ${jobs.length} job pengingat untuk: ${config.nama_laporan} (${config.period_type} ${target.periodUnit}-${target.periodeTahun})`);
            }
        }
        
        console.log(`Total ${totalJobs} job reminder ditambahkan hari ini.`);

    } catch (error) {
        console.error('❌ Terjadi kesalahan saat menjalankan scheduler reminder:', error);
    }
    console.log('--- Pengecekan Reminder Harian Selesai ---');
}, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
});

module.exports = { isReminderDay, getTargetPeriodsForCurrentMonth };
