/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Report Controller
 * Menangani siklus hidup dokumen: Upload, Progress, Verifikasi, dan CRUD
 * reportController.js/

const reportService = require('../services/reportService');
const reportRepo = require('../repositories/reportRepo');
const { AppError } = require('../middlewares/errorHandler');

// Enum yang valid untuk status verifikasi (harus sinkron dengan schema DB)
const VALID_STATUS_VERIFIKASI = ['belum_lengkap', 'lengkap', 'revisi'];

// Helper checkKetepatanWaktu telah dipindahkan ke Database Level SQL Query di reportRepo.js
// guna mencegah bottleneck N+1 CPU.

/**
 * [CREATE/UPDATE] Upload atau Timpa Laporan
 */
async function uploadReport(req, res, next) {
    try {
        const { report_type_id, periode_bulan, periode_tahun, period_type, period_unit } = req.body;
        const file = req.files && req.files.dokumen_monev ? req.files.dokumen_monev[0] : null;
        const fileExcel = req.files && req.files.dokumen_excel ? req.files.dokumen_excel[0] : null;

        let pType = period_type || 'monthly';
        let pUnit = period_unit || periode_bulan;

        if (!file && !fileExcel) throw new AppError('Minimal satu file (PDF atau Excel/Word) harus diunggah.', 400);
        if (!report_type_id || !pUnit || !periode_tahun) {
            throw new AppError('Metadata laporan (ID, Periode, Tahun) tidak lengkap.', 400);
        }

        const result = await reportService.uploadReportDocument(
            req.tenant,
            file,
            fileExcel,
            parseInt(report_type_id),
            pType,
            parseInt(pUnit),
            parseInt(periode_tahun)
        );

        res.status(201).json({
            success: true,
            message: 'Dokumen berhasil diunggah dan sistem sedang mensinkronisasi data.',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [READ] Ambil Progress Laporan Satker Sendiri
 */
async function getMyProgress(req, res, next) {
    try {
        const { bulan, tahun, period_type, period_unit } = req.query;
        let pType = period_type || 'monthly';
        let pUnit = period_unit || bulan;
        if (!pUnit || !tahun) throw new AppError('Periode dan tahun wajib disertakan.', 400);

        const data = await reportRepo.getSatkerProgress(req.tenant.satkerId, pType, pUnit, tahun);

        // status_ketepatan_waktu sekarang sudah dihitung oleh database layer
        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [READ] Download / Preview Link (Presigned URL Proxy)
 */
async function getDownloadUrl(req, res, next) {
    try {
        const { id } = req.params;
        const type = req.query.type || 'pdf'; // 'pdf' or 'excel'
        const url = await reportService.generatePresignedUrl(id, req.tenant, type);
        const BASE_PATH = process.env.BASE_PATH || '/satya';
        const proxyUrl = `${BASE_PATH}/api/v1/reports/proxy?url=${encodeURIComponent(url)}`;

        res.status(200).json({
            success: true,
            data: { url: proxyUrl }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [READ] Download / Preview Link untuk versi Riwayat (Presigned URL Proxy)
 */
async function downloadHistoryFile(req, res, next) {
    try {
        const { id } = req.params;
        const type = req.query.type || 'pdf'; // 'pdf' or 'excel'
        const url = await reportService.generatePresignedUrlForHistory(id, req.tenant, type);
        const BASE_PATH = process.env.BASE_PATH || '/satya';
        const proxyUrl = `${BASE_PATH}/api/v1/reports/proxy?url=${encodeURIComponent(url)}`;

        res.status(200).json({
            success: true,
            data: { url: proxyUrl }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [READ] Proxy endpoint for streaming MinIO presigned URLs to external browsers
 */
async function proxyMinioFile(req, res, next) {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl) throw new AppError('URL tidak valid.', 400);

        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream'
        });

        // Teruskan header Content-Type dan Content-Disposition dari MinIO
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        if (response.headers['content-disposition']) {
            res.setHeader('Content-Disposition', response.headers['content-disposition']);
        }

        response.data.pipe(res);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            res.status(404).send('File tidak ditemukan di object storage.');
        } else {
            console.error('Proxy Error:', error.message);
            res.status(500).send('Gagal mengunduh file.');
        }
    }
}

/**
 * [UPDATE] Verifikasi Laporan oleh Admin PT
 */
async function verifyReport(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') {
            throw new AppError('Hanya Admin PT yang dapat melakukan verifikasi.', 403);
        }

        const { id } = req.params;
        const { status_verifikasi, catatan_admin, nilai_angka } = req.body;

        // Validasi enum sebelum meneruskan ke service/DB
        if (!status_verifikasi || !VALID_STATUS_VERIFIKASI.includes(status_verifikasi)) {
            throw new AppError(
                `Status verifikasi tidak valid. Nilai yang diperbolehkan: ${VALID_STATUS_VERIFIKASI.join(', ')}.`,
                400
            );
        }

        // [UPDATE FEATURE B & D & E]: Luluskan req.tenant dan nilai_angka
        await reportService.verifyAndNotify(req.tenant, id, status_verifikasi, catatan_admin, nilai_angka);

        res.status(200).json({
            success: true,
            message: 'Verifikasi berhasil disimpan dan notifikasi telah dikirim.'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [READ] Dashboard Agregat untuk Pimpinan & Admin
 */
async function getDashboardAgregat(req, res, next) {
    try {
        const { bulan, tahun, period_type, period_unit } = req.query;
        let pType = period_type || 'monthly';
        let pUnit = period_unit || bulan;
        const data = await reportRepo.getRekapitulasiPimpinan(pType, pUnit, tahun);

        const formattedData = data.map(satker => {
            const totalWajib = parseInt(satker.total_wajib);
            const totalUpload = parseInt(satker.total_upload);
            const persentase = totalWajib === 0 ? 0 : Math.round((totalUpload / totalWajib) * 100);

            const detail_laporan_formatted = satker.detail_laporan.map(dl => ({
                ...dl,
                status_upload: dl.submission_id ? 'sudah_upload' : 'belum_upload'
                // status_ketepatan_waktu secara otomatis dikembalikan oleh knex raw query
            }));

            return {
                ...satker,
                detail_laporan: detail_laporan_formatted,
                statistik: {
                    total_wajib: totalWajib,
                    total_upload: totalUpload,
                    belum_upload: totalWajib - totalUpload,
                    persentase_kepatuhan: `${persentase}%`
                }
            };
        });

        res.status(200).json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [READ] Export Dashboard Agregat ke Excel
 */
async function exportDashboardAgregat(req, res, next) {
    try {
        const { bulan, tahun, period_type, period_unit } = req.query;
        let pType = period_type || 'monthly';
        let pUnit = period_unit || bulan;
        const data = await reportRepo.getRekapitulasiPimpinan(pType, pUnit, tahun);

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rekapitulasi Kepatuhan');

        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Satuan Kerja', key: 'nama_satker', width: 30 },
            { header: 'Total Wajib', key: 'total_wajib', width: 15 },
            { header: 'Total Upload', key: 'total_upload', width: 15 },
            { header: 'Persentase', key: 'persentase', width: 15 },
            { header: 'Rata-rata Nilai', key: 'rata_rata_nilai', width: 15 },
        ];

        data.forEach((satker, index) => {
            const totalWajib = parseInt(satker.total_wajib);
            const totalUpload = parseInt(satker.total_upload);
            const persentase = totalWajib === 0 ? 0 : Math.round((totalUpload / totalWajib) * 100);
            const rataRataNilai = satker.rata_rata_nilai ? parseFloat(satker.rata_rata_nilai).toFixed(1) : '-';

            worksheet.addRow({
                no: index + 1,
                nama_satker: satker.nama_satker,
                total_wajib: totalWajib,
                total_upload: totalUpload,
                persentase: `${persentase}%`,
                rata_rata_nilai: rataRataNilai
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Rekapitulasi_Kepatuhan_${pUnit}_${tahun}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
}

/**
 * [DELETE] Hapus Laporan oleh Satker
 */
async function deleteReport(req, res, next) {
    try {
        const { id } = req.params;
        await reportService.deleteReportDocument(req.tenant, id);

        res.status(200).json({
            success: true,
            message: 'Dokumen dan data laporan berhasil dihapus permanently.'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [READ] Admin Stats — Antrian Verifikasi, Loop Revisi, Ketepatan Waktu, Aktivitas Terbaru
 */
async function getAdminStats(req, res, next) {
    try {
        const allowedRoles = ['ADMIN_PT', 'KPT', 'WKPT', 'PANITERA_PT'];
        if (!allowedRoles.includes(req.tenant.role)) {
            throw new AppError('Hanya Admin atau Pimpinan PT yang dapat mengakses.', 403);
        }
        const { bulan, tahun, period_type, period_unit } = req.query;
        const pType = period_type || 'monthly';
        const pUnit = period_unit || bulan || '1';
        const pTahun = tahun || String(new Date().getFullYear());

        const [antrian, revisi, ketepatan, aktivitas] = await Promise.all([
            reportRepo.getAntrianVerifikasi(pType, pUnit, pTahun),
            reportRepo.getLoopRevisi(),
            reportRepo.getKetepatanWaktu(pType, pUnit, pTahun),
            reportRepo.getRecentActivity(),
        ]);

        res.status(200).json({
            success: true,
            data: {
                antrian_verifikasi: { jumlah: antrian.length, items: antrian },
                loop_revisi: { jumlah: revisi.length, items: revisi },
                ketepatan_waktu: ketepatan,
                aktivitas_terbaru: aktivitas,
            }
        });
    } catch (error) { next(error); }
}

/**
 * [READ] BullMQ Queue Status — Status job email (waiting, active, completed, failed)
 */
async function getQueueStatus(req, res, next) {
    try {
        const allowedRoles = ['ADMIN_PT', 'KPT', 'WKPT', 'PANITERA_PT'];
        if (!allowedRoles.includes(req.tenant.role)) {
            throw new AppError('Hanya Admin atau Pimpinan PT yang dapat mengakses.', 403);
        }
        const { emailQueue } = require('../emailWorker');
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            emailQueue.getWaitingCount(),
            emailQueue.getActiveCount(),
            emailQueue.getCompletedCount(),
            emailQueue.getFailedCount(),
            emailQueue.getDelayedCount(),
        ]);
        const failedJobs = await emailQueue.getFailed(0, 5); // 5 job terbaru yang gagal
        res.status(200).json({
            success: true,
            data: {
                waiting, active, completed, failed, delayed,
                recent_failed: failedJobs.map(j => ({
                    id: j.id,
                    name: j.name,
                    failedReason: j.failedReason,
                    timestamp: j.timestamp,
                }))
            }
        });
    } catch (error) { next(error); }
}

/**
 * [READ] Dashboard Heatmap Kepatuhan — 12 bulan × N satker
 *
 * Query params:
 *   - tahun (number, default: tahun sekarang)
 *
 * Response shape:
 * {
 *   success: true,
 *   tahun: 2026,
 *   data: [
 *     {
 *       satker_id: 1,
 *       nama_satker: "PN Batam",
 *       rata_tahunan: 68,          -- rata-rata persen kepatuhan setahun
 *       sel: [
 *         { bulan: 1, total_wajib: 28, total_upload: 20, persen: 71, persen_tepat_waktu: 80, warna: "kuning" },
 *         ...(12 bulan)
 *       ]
 *     }
 *   ]
 * }
 */
async function getDashboardHeatmap(req, res, next) {
    try {
        const tahun = parseInt(req.query.tahun) || new Date().getFullYear();

        const rows = await reportRepo.getHeatmapKepatuhan(tahun);

        // Kelompokkan rows per satker
        const satkerMap = new Map();
        for (const row of rows) {
            if (!satkerMap.has(row.satker_id)) {
                satkerMap.set(row.satker_id, {
                    satker_id: row.satker_id,
                    nama_satker: row.nama_satker,
                    sel: [],
                });
            }
            satkerMap.get(row.satker_id).sel.push({
                bulan: row.bulan,
                total_wajib: row.total_wajib,
                total_upload: row.total_upload,
                persen: row.persen,
                persen_tepat_waktu: row.persen_tepat_waktu,
                warna: _resolveWarna(row.persen),
            });
        }

        // Hitung rata-rata tahunan per satker (hanya bulan yang sudah berlalu)
        const bulanSekarang = new Date().getMonth() + 1; // 1-12
        const isThisYear = tahun === new Date().getFullYear();

        const formatted = Array.from(satkerMap.values()).map(satker => {
            const selRelevant = isThisYear
                ? satker.sel.filter(s => s.bulan <= bulanSekarang)
                : satker.sel;

            const rata = selRelevant.length === 0
                ? 0
                : Math.round(selRelevant.reduce((acc, s) => acc + s.persen, 0) / selRelevant.length);

            return {
                ...satker,
                rata_tahunan: rata,
                warna_rata: _resolveWarna(rata),
            };
        });

        // Statistik ringkas untuk header dashboard
        const statsGlobal = _hitungStatsGlobal(formatted, isThisYear, bulanSekarang);

        res.status(200).json({
            success: true,
            tahun,
            stats: statsGlobal,
            data: formatted,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Helper: Menentukan warna sel heatmap berdasarkan persentase kepatuhan.
 *   >= 80% → 'hijau'
 *   >= 50% → 'kuning'
 *   > 0%   → 'merah'
 *   == 0%  → 'abu'   (belum ada upload)
 */
function _resolveWarna(persen) {
    if (persen === null || persen === undefined) return 'abu';
    if (persen >= 80) return 'hijau';
    if (persen >= 50) return 'kuning';
    if (persen > 0)   return 'merah';
    return 'abu';
}

/**
 * Helper: Statistik global lintas satker untuk satu tahun.
 */
function _hitungStatsGlobal(satkers, isThisYear, bulanSekarang) {
    let totalSel = 0, totalUpload = 0, totalWajib = 0;
    let satkerMerah = 0; // satker dgn rata < 50%

    for (const satker of satkers) {
        const sel = isThisYear
            ? satker.sel.filter(s => s.bulan <= bulanSekarang)
            : satker.sel;

        for (const s of sel) {
            totalSel++;
            totalUpload += s.total_upload;
            totalWajib += s.total_wajib;
        }
        if (satker.rata_tahunan < 50) satkerMerah++;
    }

    const persenGlobal = totalWajib === 0
        ? 0
        : Math.round((totalUpload / totalWajib) * 100);

    return {
        persen_global: persenGlobal,
        total_upload: totalUpload,
        total_wajib: totalWajib,
        satker_merah: satkerMerah,  // satker konsisten rendah
        warna_global: _resolveWarna(persenGlobal),
    };
}

/**
 * [READ] Ambil Histori Revisi (Audit Trail)
 */
async function getSubmissionHistory(req, res, next) {
    try {
        const { id } = req.params;
        const history = await reportRepo.getSubmissionHistory(id);

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    uploadReport,
    getMyProgress,
    getDownloadUrl,
    downloadHistoryFile,
    proxyMinioFile,
    verifyReport,
    getDashboardAgregat,
    getDashboardHeatmap,
    exportDashboardAgregat,
    getAdminStats,
    getQueueStatus,
    getSubmissionHistory,
    deleteReport
};