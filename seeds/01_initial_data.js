const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
    // Hapus data yang ada sebelumnya (untuk mereset)
    await knex('report_submissions').del();
    await knex('users').del();
    await knex('satkers').del();
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
        { id: 1, username: 'admin_pt', password_hash: defaultPassword, role: 'ADMIN_PT', satker_id: null, email: 'admin@pt.go.id' },
        { id: 2, username: 'pimpinan_pt', password_hash: defaultPassword, role: 'PIMPINAN', satker_id: null, email: 'pimpinan@pt.go.id' },
        { id: 3, username: 'pn_tpi', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 1, email: 'pn_tpi@contoh.com' },
        { id: 4, username: 'pn_batam', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 2, email: 'pn_batam@contoh.com' },
        { id: 5, username: 'pn_tbk', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 3, email: 'pn_tbk@contoh.com' },
        { id: 6, username: 'pn_natuna', password_hash: defaultPassword, role: 'SATKER_PN', satker_id: 4, email: 'pn_natuna@contoh.com' }
    ]);

    // 3. Data Jenis Laporan Wajib
    await knex('report_types').insert([
        { id: 1, nama_laporan: 'Laporan Delegasi Keluar yang Kurang dan Lebih dari 14 Hari', is_wajib: true },
        { id: 2, nama_laporan: 'Laporan Delegasi Masuk dan Keluar 5 Hari Belum Selesai Dilaksanakan', is_wajib: true },
        { id: 3, nama_laporan: 'Laporan Delegasi Masuk dan Keluar', is_wajib: true },
        { id: 4, nama_laporan: 'Laporan Evaluasi Bulanan Perkara Pidana dan Perdata', is_wajib: true },
        { id: 5, nama_laporan: 'Laporan Jenis Perkara Perdata (M.IIA)', is_wajib: true },
        { id: 6, nama_laporan: 'Laporan Jenis Perkara Pidana (M.IA)', is_wajib: true },
        { id: 7, nama_laporan: 'Laporan Keadaan Keuangan Perkara Perdata (L1.A7)', is_wajib: true },
        { id: 8, nama_laporan: 'Laporan Keadaan Perkara Perdata (L1.A1)', is_wajib: true },
        { id: 9, nama_laporan: 'Laporan Keadaan Perkara Pidana (L1.B1)', is_wajib: true },
        { id: 10, nama_laporan: 'Laporan Keberhasilan Mediasi', is_wajib: true },
        { id: 11, nama_laporan: 'Laporan Kepatuhan Pengembalian Sisa Panjar', is_wajib: true },
        { id: 12, nama_laporan: 'Laporan Monev Litigasi Perdata Sudah', is_wajib: true },
        { id: 13, nama_laporan: 'Laporan Monev Perkara Perdata BHT Tidak Dapat Dieksekusi', is_wajib: true },
        { id: 14, nama_laporan: 'Laporan Pembebasan Biaya Perkara', is_wajib: true },
        { id: 15, nama_laporan: 'Laporan Pengaduan', is_wajib: true },
        { id: 16, nama_laporan: 'Laporan Pengembalian Sisa Panjar', is_wajib: true },
        { id: 17, nama_laporan: 'Laporan Penyelesaian Pengaduan', is_wajib: true },
        { id: 18, nama_laporan: 'Laporan Perdata yang Diajukan Banding, Kasasi, PK dan Eksekusi', is_wajib: true },
        { id: 19, nama_laporan: 'Laporan Perkara Perdata Eksekusi yang Belum Dilaksanakan', is_wajib: true },
        { id: 20, nama_laporan: 'Laporan Pidana yang Diajukan Banding, Kasasi, PK dan Grasi', is_wajib: true },
        { id: 21, nama_laporan: 'Laporan Posbakum', is_wajib: true },
        { id: 22, nama_laporan: 'Laporan Rekapitulasi Diversi', is_wajib: true },
        { id: 23, nama_laporan: 'Laporan Rekapitulasi Mediasi', is_wajib: true },
        { id: 24, nama_laporan: 'Laporan Rekapitulasi Restoratif Justice', is_wajib: true },
        { id: 25, nama_laporan: 'Laporan Sidang di Luar Gedung Pengadilan', is_wajib: true },
        { id: 26, nama_laporan: 'Monev Akurasi dan Kualitas Data SIPP', is_wajib: true },
        { id: 27, nama_laporan: 'Monev E-BERPADU', is_wajib: true },
        { id: 28, nama_laporan: 'Rekapitulasi Laporan Perkara Pidana dan Perdata Banding yang Tidak Mengajukan Kasasi dan PK', is_wajib: true },
        { id: 29, nama_laporan: 'Monev Lainnya (Opsional)', is_wajib: false }
    ]);

    // 4. Update PostgreSQL sequence to match MAX(id) if running in PG
    if (knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql') {
        const tablesWithId = ['satkers', 'users', 'report_types'];
        for (const table of tablesWithId) {
            await knex.raw(`SELECT setval('${table}_id_seq', (SELECT MAX(id) FROM ${table}))`);
        }
    }
};