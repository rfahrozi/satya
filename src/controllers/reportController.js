/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Report Controller
 * Menangani siklus hidup dokumen: Upload, Progress, Verifikasi, dan CRUD
 */

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
        const file = req.file;

        let pType = period_type || 'monthly';
        let pUnit = period_unit || periode_bulan;

        if (!file) throw new AppError('File dokumen tidak ditemukan.', 400);
        if (!report_type_id || !pUnit || !periode_tahun) {
            throw new AppError('Metadata laporan (ID, Periode, Tahun) tidak lengkap.', 400);
        }

        const result = await reportService.uploadReportDocument(
            req.tenant,
            file,
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
 * [READ] Download / Preview Link (Presigned URL)
 */
async function getDownloadUrl(req, res, next) {
    try {
        const { id } = req.params;
        const url = await reportService.generatePresignedUrl(id, req.tenant);

        res.status(200).json({
            success: true,
            data: { url }
        });
    } catch (error) {
        next(error);
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
        const { status_verifikasi, catatan_admin } = req.body;

        // Validasi enum sebelum meneruskan ke service/DB
        if (!status_verifikasi || !VALID_STATUS_VERIFIKASI.includes(status_verifikasi)) {
            throw new AppError(
                `Status verifikasi tidak valid. Nilai yang diperbolehkan: ${VALID_STATUS_VERIFIKASI.join(', ')}.`,
                400
            );
        }

        await reportService.verifyAndNotify(id, status_verifikasi, catatan_admin);

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

module.exports = {
    uploadReport,
    getMyProgress,
    getDownloadUrl,
    verifyReport,
    getDashboardAgregat,
    deleteReport
};