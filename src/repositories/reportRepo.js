/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Report Repository
 * Layer akses data untuk semua operasi laporan
 */
const knex = require('../config/knex');

/**
 * Helper: Menghitung deadline periode pelaporan secara Dinamis
 */
function getDeadlineDate(bulan, tahun) {
    let deadlineMonth = parseInt(bulan) + 1;
    let deadlineYear = parseInt(tahun);
    if (deadlineMonth > 12) {
        deadlineMonth = 1;
        deadlineYear += 1;
    }
    const deadlineDay = parseInt(process.env.DEADLINE_DAY) || 10;
    // Format timestamp batas waktu upload (hingga 23:59:59 hari H)
    return new Date(deadlineYear, deadlineMonth - 1, deadlineDay, 23, 59, 59);
}

/**
 * [READ] Progress laporan satu satker untuk periode tertentu.
 * Menggabungkan SEMUA jenis laporan (LEFT JOIN) sehingga yang belum upload pun tampil.
 */
async function getSatkerProgress(satkerId, bulan, tahun) {
    const deadlineDate = getDeadlineDate(bulan, tahun);
    return await knex('report_types as rt')
        .select(
            'rt.id as report_type_id', 
            'rt.nama_laporan', 
            'rs.id as submission_id', 
            'rs.status_verifikasi', 
            'rs.catatan_admin', 
            'rs.created_at',
            knex.raw(`
                CASE 
                    WHEN rs.created_at IS NULL THEN NULL
                    WHEN rs.created_at <= ? THEN 'Tepat Waktu'
                    ELSE 'Terlambat'
                END as status_ketepatan_waktu
            `, [deadlineDate])
        )
        .leftJoin('report_submissions as rs', function() {
            this.on('rt.id', '=', 'rs.report_type_id')
                .andOn('rs.satker_id', '=', knex.raw('?', [satkerId]))
                .andOn('rs.periode_bulan', '=', knex.raw('?', [bulan]))
                .andOn('rs.periode_tahun', '=', knex.raw('?', [tahun]));
        }).orderBy('rt.id', 'asc');
}

/**
 * [READ] Rekapitulasi dashboard untuk Pimpinan dan Admin.
 * Menggabungkan semua satker × semua jenis laporan dalam satu query.
 */
async function getRekapitulasiPimpinan(bulan, tahun) {
    const deadlineDate = getDeadlineDate(bulan, tahun);
    const res = await knex.raw(`
        SELECT s.nama_satker,
        COUNT(rt.id) as total_wajib,
        COUNT(rs.id) as total_upload,
        json_agg(json_build_object(
            'nama_laporan', rt.nama_laporan, 
            'report_type_id', rt.id, 
            'status_verifikasi', rs.status_verifikasi, 
            'submission_id', rs.id, 
            'created_at', rs.created_at,
            'status_ketepatan_waktu', CASE 
                WHEN rs.created_at IS NULL THEN NULL
                WHEN rs.created_at <= ? THEN 'Tepat Waktu'
                ELSE 'Terlambat'
            END
        )) as detail_laporan
        FROM satkers s CROSS JOIN report_types rt
        LEFT JOIN report_submissions rs ON rs.satker_id = s.id AND rs.report_type_id = rt.id AND rs.periode_bulan = ? AND rs.periode_tahun = ?
        WHERE rt.is_wajib = true 
        GROUP BY s.id, s.nama_satker
        ORDER BY s.id ASC
    `, [deadlineDate, bulan, tahun]);
    return res.rows;
}

/**
 * [READ] Jumlah total jenis laporan yang bersifat wajib.
 * Digunakan oleh scheduler untuk validasi awal sebelum mengirim reminder.
 */
async function getTotalReportTypes() {
    const result = await knex('report_types').where({ is_wajib: true }).count('id as total').first();
    return parseInt(result.total);
}

/**
 * [READ] Daftar satker yang BELUM melengkapi semua laporan wajib untuk periode tertentu.
 * Hanya satker dengan email terdaftar yang akan mendapat reminder.
 *
 * @param {number} periodeBulan
 * @param {number} periodeTahun
 * @returns {Array<{id, nama_satker, email}>}
 */
async function findSatkersForReminder(periodeBulan, periodeTahun) {
    const result = await knex.raw(`
        SELECT s.id, s.nama_satker, u.email
        FROM satkers s
        JOIN users u ON u.satker_id = s.id
            AND u.role = 'SATKER_PN'
            AND u.is_active = true
            AND u.email IS NOT NULL
        WHERE (
            SELECT COUNT(*) FROM report_submissions rs
            WHERE rs.satker_id = s.id
              AND rs.periode_bulan = ?
              AND rs.periode_tahun = ?
        ) < (
            SELECT COUNT(*) FROM report_types WHERE is_wajib = true
        )
    `, [periodeBulan, periodeTahun]);
    return result.rows;
}

module.exports = {
    getSatkerProgress,
    getRekapitulasiPimpinan,
    getTotalReportTypes,
    findSatkersForReminder
};