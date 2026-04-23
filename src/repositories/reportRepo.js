/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Report Repository
 * Layer akses data untuk semua operasi laporan
 */
const knex = require('../config/knex');

/**
 * Helper: Menghitung Tahun/Bulan target untuk batas waktu upload
 */
function getBaseDeadlineMonthYear(periodType, periodUnit, tahun) {
    let m = 1;
    let y = parseInt(tahun);
    if (periodType === 'monthly') m = parseInt(periodUnit) + 1;
    else if (periodType === 'quarterly') m = (parseInt(periodUnit) * 3) + 1;
    else if (periodType === 'semesterly') m = (parseInt(periodUnit) * 6) + 1;
    else if (periodType === 'annually') m = 13;

    if (m > 12) {
        m = m - 12;
        y += 1;
    }
    return { m, y };
}

/**
 * [READ] Progress laporan satu satker untuk periode tertentu.
 * Menggabungkan SEMUA jenis laporan (LEFT JOIN) sehingga yang belum upload pun tampil.
 */
async function getSatkerProgress(satkerId, periodType, periodUnit, tahun) {
    const { m, y } = getBaseDeadlineMonthYear(periodType, periodUnit, tahun);
    
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
                    WHEN rs.created_at <= make_timestamp(?, ?, COALESCE(dc.day_of_period, 10), 23, 59, 59) THEN 'Tepat Waktu'
                    ELSE 'Terlambat'
                END as status_ketepatan_waktu
            `, [y, m])
        )
        .leftJoin('deadline_configs as dc', function() {
            this.on('dc.report_type_id', '=', 'rt.id')
                .andOn('dc.period_type', '=', knex.raw('?', [periodType]));
        })
        .leftJoin('report_submissions as rs', function() {
            this.on('rt.id', '=', 'rs.report_type_id')
                .andOn('rs.satker_id', '=', knex.raw('?', [satkerId]))
                .andOn('rs.period_type', '=', knex.raw('?', [periodType]))
                .andOn('rs.period_unit', '=', knex.raw('?', [periodUnit]))
                .andOn('rs.periode_tahun', '=', knex.raw('?', [tahun]));
        }).orderBy('rt.id', 'asc');
}

/**
 * [READ] Rekapitulasi dashboard untuk Pimpinan dan Admin.
 * Menggabungkan semua satker × semua jenis laporan dalam satu query.
 */
async function getRekapitulasiPimpinan(periodType, periodUnit, tahun) {
    const { m, y } = getBaseDeadlineMonthYear(periodType, periodUnit, tahun);
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
                WHEN rs.created_at <= make_timestamp(?, ?, COALESCE(dc.day_of_period, 10), 23, 59, 59) THEN 'Tepat Waktu'
                ELSE 'Terlambat'
            END
        )) as detail_laporan
        FROM satkers s CROSS JOIN report_types rt
        LEFT JOIN deadline_configs dc ON dc.report_type_id = rt.id AND dc.period_type = ?
        LEFT JOIN report_submissions rs ON rs.satker_id = s.id AND rs.report_type_id = rt.id AND rs.period_type = ? AND rs.period_unit = ? AND rs.periode_tahun = ?
        WHERE rt.is_wajib = true 
        GROUP BY s.id, s.nama_satker
        ORDER BY s.id ASC
    `, [y, m, periodType, periodType, periodUnit, tahun]);
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
 * @param {string} periodType 
 * @param {number} periodUnit
 * @param {number} periodeTahun
 * @returns {Array<{id, nama_satker, email}>}
 */
async function findSatkersForReminder(periodType, periodUnit, periodeTahun) {
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
              AND rs.period_type = ?
              AND rs.period_unit = ?
              AND rs.periode_tahun = ?
        ) < (
            SELECT COUNT(*) FROM report_types WHERE is_wajib = true
        )
    `, [periodType, periodUnit, periodeTahun]);
    return result.rows;
}

module.exports = {
    getSatkerProgress,
    getRekapitulasiPimpinan,
    getTotalReportTypes,
    findSatkersForReminder
};