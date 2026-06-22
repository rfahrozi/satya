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
            'rt.is_wajib',
            'rs.id as submission_id', 
            'rs.status_verifikasi', 
            'rs.catatan_admin', 
            'rs.nilai_angka',
            'rs.created_at',
            knex.raw(`
                CASE 
                    WHEN rs.created_at IS NULL THEN NULL
                    WHEN rs.created_at <= make_timestamp(?, ?, COALESCE(dc.day_of_period, 10), 23, 59, 59) THEN 'Tepat Waktu'
                    ELSE 'Terlambat'
                END as status_ketepatan_waktu,
                make_timestamp(?, ?, COALESCE(dc.day_of_period, 10), 23, 59, 59) as deadline_date
            `, [y, m, y, m])
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
        AVG(rs.nilai_angka) as rata_rata_nilai,
        json_agg(json_build_object(
            'nama_laporan', rt.nama_laporan, 
            'report_type_id', rt.id, 
            'status_verifikasi', rs.status_verifikasi, 
            'submission_id', rs.id, 
            'nilai_angka', rs.nilai_angka,
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

/**
 * [READ] Antrian Verifikasi — laporan yang sudah diupload tapi belum diverifikasi admin.
 * Status 'belum_lengkap' = sudah upload, belum disentuh admin.
 */
async function getAntrianVerifikasi(periodType, periodUnit, tahun) {
    const result = await knex('report_submissions as rs')
        .join('report_types as rt', 'rs.report_type_id', 'rt.id')
        .join('satkers as s', 'rs.satker_id', 's.id')
        .select(
            'rs.id as submission_id',
            'rt.nama_laporan',
            's.nama_satker',
            'rs.created_at',
            'rs.period_type',
            'rs.period_unit',
            'rs.periode_tahun'
        )
        .where('rs.status_verifikasi', 'belum_lengkap')
        .where('rs.period_type', periodType)
        .where('rs.period_unit', String(periodUnit))
        .where('rs.periode_tahun', String(tahun))
        .orderBy('rs.created_at', 'asc');
    return result;
}

/**
 * [READ] Loop Revisi — laporan berstatus 'revisi' beserta durasi tertahan (hari).
 */
async function getLoopRevisi() {
    const result = await knex.raw(`
        SELECT
            rs.id as submission_id,
            rt.nama_laporan,
            s.nama_satker,
            rs.updated_at,
            rs.catatan_admin,
            EXTRACT(EPOCH FROM (NOW() - rs.updated_at)) / 86400 AS hari_tertahan
        FROM report_submissions rs
        JOIN report_types rt ON rs.report_type_id = rt.id
        JOIN satkers s ON rs.satker_id = s.id
        WHERE rs.status_verifikasi = 'revisi'
        ORDER BY hari_tertahan DESC
    `);
    return result.rows;
}

/**
 * [READ] Ketepatan Waktu — perbandingan laporan tepat waktu vs terlambat.
 */
async function getKetepatanWaktu(periodType, periodUnit, tahun) {
    const { m, y } = getBaseDeadlineMonthYear(periodType, periodUnit, tahun);
    const result = await knex.raw(`
        SELECT
            COUNT(*) FILTER (WHERE rs.created_at <= make_timestamp(?, ?, COALESCE(dc.day_of_period, 10), 23, 59, 59)) AS tepat_waktu,
            COUNT(*) FILTER (WHERE rs.created_at > make_timestamp(?, ?, COALESCE(dc.day_of_period, 10), 23, 59, 59)) AS terlambat,
            COUNT(*) AS total_upload
        FROM report_submissions rs
        LEFT JOIN deadline_configs dc ON dc.report_type_id = rs.report_type_id AND dc.period_type = ?
        WHERE rs.period_type = ? AND rs.period_unit = ? AND rs.periode_tahun = ?
    `, [y, m, y, m, periodType, periodType, String(periodUnit), String(tahun)]);
    return result.rows[0];
}

/**
 * [READ] Log Aktivitas Terbaru — 15 aksi terakhir di sistem (upload + verifikasi).
 */
async function getRecentActivity() {
    const result = await knex.raw(`
        SELECT
            rs.id,
            s.nama_satker,
            rt.nama_laporan,
            rs.status_verifikasi,
            rs.updated_at,
            CASE
                WHEN rs.status_verifikasi = 'belum_lengkap' THEN 'upload'
                WHEN rs.status_verifikasi = 'lengkap'       THEN 'verified_ok'
                WHEN rs.status_verifikasi = 'revisi'        THEN 'verified_revisi'
            END AS tipe_aksi
        FROM report_submissions rs
        JOIN satkers s ON rs.satker_id = s.id
        JOIN report_types rt ON rs.report_type_id = rt.id
        ORDER BY rs.updated_at DESC
        LIMIT 15
    `);
    return result.rows;
}

/**
 * [READ] Heatmap Kepatuhan — Agregasi bulanan per satker selama satu tahun.
 *
 * Mengembalikan matriks 12 bulan × N satker dengan persentase kepatuhan tiap sel.
 * Khusus untuk laporan monthly (period_type = 'monthly').
 *
 * Format hasil:
 * [
 *   {
 *     satker_id: 1,
 *     nama_satker: 'PN Batam',
 *     bulan: 1,        -- 1-12
 *     total_wajib: 28,
 *     total_upload: 20,
 *     persen: 71,      -- integer 0-100
 *     rata_tepat_waktu: 65  -- persen laporan yang tepat waktu dari yg diupload
 *   },
 *   ...
 * ]
 *
 * @param {number|string} tahun - Tahun kalender (contoh: 2026)
 * @returns {Promise<Array>}
 */
async function getHeatmapKepatuhan(tahun) {
    const y = parseInt(tahun);
    const res = await knex.raw(`
        WITH
        -- Semua bulan 1-12
        bulan_series AS (
            SELECT generate_series(1, 12) AS bulan
        ),
        -- Total laporan wajib (konstan, tidak bergantung bulan)
        total_wajib_cte AS (
            SELECT COUNT(*) AS total_wajib
            FROM report_types
            WHERE is_wajib = true
        ),
        -- Semua kombinasi satker × bulan
        satker_bulan AS (
            SELECT s.id AS satker_id, s.nama_satker, b.bulan
            FROM satkers s
            CROSS JOIN bulan_series b
        ),
        -- Upload yang masuk pada bulan dan tahun tersebut (monthly)
        upload_per_bulan AS (
            SELECT
                rs.satker_id,
                rs.period_unit::integer AS bulan,
                COUNT(rs.id)                        AS total_upload,
                -- Laporan tepat waktu: upload <= tanggal 10 bulan berikutnya
                COUNT(rs.id) FILTER (
                    WHERE rs.created_at <= make_timestamp(
                        CASE WHEN rs.period_unit::integer = 12 THEN ? + 1 ELSE ? END,
                        CASE WHEN rs.period_unit::integer = 12 THEN 1  ELSE rs.period_unit::integer + 1 END,
                        COALESCE(dc.day_of_period, 10), 23, 59, 59
                    )
                )                                   AS tepat_waktu
            FROM report_submissions rs
            LEFT JOIN deadline_configs dc
                ON dc.report_type_id = rs.report_type_id
                AND dc.period_type = 'monthly'
            WHERE rs.period_type = 'monthly'
              AND rs.periode_tahun = ?
            GROUP BY rs.satker_id, rs.period_unit::integer
        )
        SELECT
            sb.satker_id,
            sb.nama_satker,
            sb.bulan,
            tw.total_wajib::integer                                         AS total_wajib,
            COALESCE(up.total_upload, 0)::integer                           AS total_upload,
            CASE
                WHEN tw.total_wajib = 0 THEN 0
                ELSE ROUND((COALESCE(up.total_upload, 0)::numeric / tw.total_wajib) * 100)
            END::integer                                                    AS persen,
            CASE
                WHEN COALESCE(up.total_upload, 0) = 0 THEN NULL
                ELSE ROUND((COALESCE(up.tepat_waktu, 0)::numeric / up.total_upload) * 100)
            END::integer                                                    AS persen_tepat_waktu
        FROM satker_bulan sb
        CROSS JOIN total_wajib_cte tw
        LEFT JOIN upload_per_bulan up
            ON up.satker_id = sb.satker_id
            AND up.bulan = sb.bulan
        ORDER BY sb.satker_id ASC, sb.bulan ASC
    `, [y, y, y]);
    return res.rows;
}

/**
 * [READ] Dapatkan histori revisi dan verifikasi untuk sebuah submission.
 */
async function getSubmissionHistory(submissionId) {
    const res = await knex.raw(`
        SELECT l.*,
               u.username as actor_name,
               u.role as actor_role
        FROM report_revision_logs l
        LEFT JOIN users u ON u.role = l.actor OR l.actor = 'ADMIN_PT'
        WHERE l.submission_id = ?
        ORDER BY l.created_at DESC
    `, [submissionId]);
    return res.rows;
}

module.exports = {
    getSatkerProgress,
    getRekapitulasiPimpinan,
    getTotalReportTypes,
    findSatkersForReminder,
    getAntrianVerifikasi,
    getLoopRevisi,
    getKetepatanWaktu,
    getRecentActivity,
    getHeatmapKepatuhan,
    getSubmissionHistory,
};