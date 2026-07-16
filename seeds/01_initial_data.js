const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
    // Hapus data yang ada sebelumnya (untuk mereset)
    await knex('report_submissions').del();
    await knex('users').del();
    await knex('satkers').del();
    await knex('deadline_configs').del();
    await knex('report_types').del();

    // 1. Data Satker (Pengadilan Negeri)
    await knex('satkers').insert([
        { id: 1, nama_satker: 'Pengadilan Negeri Tanjungpinang' },
        { id: 2, nama_satker: 'Pengadilan Negeri Batam' },
        { id: 3, nama_satker: 'Pengadilan Negeri Tanjung Balai Karimun' },
        { id: 4, nama_satker: 'Pengadilan Negeri Natuna' }
    ]);

    // 2. Data Akun Pengguna (Default Password: password123)
    const defaultPassword = await bcrypt.hash('password123', 10);
    await knex('users').insert([
        { id: 1, username: 'admin_pt', password_hash: defaultPassword, role: 'ADMIN_PT', satker_id: null, email: 'ptkepulauanriau@gmail.com' },
        { id: 2, username: 'pimpinan_pt', password_hash: defaultPassword, role: 'PIMPINAN', satker_id: null, email: 'pimpinan.ptkepulauanriau@gmail.com' },
        { id: 3, username: 'pn_tpi', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 1, email: 'pn_tpi@contoh.com' },
        { id: 4, username: 'pn_batam', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 2, email: 'pn_batam@contoh.com' },
        { id: 5, username: 'pn_tbk', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 3, email: 'pn_tbk@contoh.com' },
        { id: 6, username: 'pn_natuna', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 4, email: 'pn_natuna@contoh.com' }
    ]);

    // 3. Data Jenis Laporan Wajib
    await knex('report_types').insert([
        { id: 1, nama_laporan: 'Monev Permohonan Eksekusi', is_wajib: true },
        { id: 2, nama_laporan: 'Monev Biaya Eksekusi', is_wajib: true },
        { id: 3, nama_laporan: 'Monev Pelaksanaan Surat Tercatat', is_wajib: true },
        { id: 4, nama_laporan: 'Monev Panjar Biaya Perkara (Sisa Panjar)', is_wajib: true },
        { id: 5, nama_laporan: 'Monev Register Elektronik & Backup Data SIPP', is_wajib: true },
        { id: 6, nama_laporan: 'Monev Pelaporan Perkara Elektronik', is_wajib: true },
        { id: 7, nama_laporan: 'Monev Keuangan Perkara PN', is_wajib: true },
        { id: 8, nama_laporan: 'Pelaporan Keuangan Perkara (Komdanas & e-Bima)', is_wajib: true },
        { id: 9, nama_laporan: 'Monev Restorative Justice (RJ)', is_wajib: true },
        { id: 10, nama_laporan: 'Laporan Akurasi dan Pengendalian Mutu Data SIPP', is_wajib: true },
        { id: 11, nama_laporan: 'Monev Penerapan KUHP dan KUHAP Baru', is_wajib: true },
        { id: 12, nama_laporan: 'Monev Layanan Disabilitas', is_wajib: true }
    ]);
    
    // 4. Data Deadline Konfigurasi Default (Bulanan, Tanggal 10)
    const deadlineConfigs = [];
    for (let i = 1; i <= 12; i++) {
        deadlineConfigs.push({
            report_type_id: i,
            period_type: 'monthly',
            day_of_period: 10
        });
    }
    
    // If you want to specify different periods for specific reports, change them here
    // example: deadlineConfigs[0].period_type = 'quarterly';
    
    await knex('deadline_configs').insert(deadlineConfigs);

    // 5. Update PostgreSQL sequence to match MAX(id) if running in PG
    if (knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql') {
        const tablesWithId = ['satkers', 'users', 'report_types', 'deadline_configs'];
        for (const table of tablesWithId) {
            await knex.raw(`SELECT setval('${table}_id_seq', (SELECT MAX(id) FROM ${table}))`);
        }
    }
};
