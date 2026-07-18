/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Report Service
 * Logika Bisnis Utama untuk Pengelolaan Dokumen dan Alur Kerja
 */

const { minioClient, BUCKET_NAME } = require('../config/minio');
const reportRepo = require('../repositories/reportRepo');
const knex = require('../config/knex');
const { AppError } = require('../middlewares/errorHandler');
const { emailQueue } = require('../emailWorker');

/**
 * [CREATE/UPDATE] Logika Unggah Dokumen dengan Fitur Clean-up File Lama
 */
async function uploadReportDocument(tenant, file, fileExcel, reportTypeId, periodType, periodUnit, tahun) {
    // 1. Cek apakah sudah ada submission sebelumnya (untuk kebutuhan UPDATE/Timpa)
    const existing = await knex('report_submissions')
        .where({ 
            satker_id: tenant.satkerId, 
            report_type_id: reportTypeId, 
            period_type: periodType,
            period_unit: periodUnit, 
            periode_tahun: tahun 
        }).first();

    // 2. Jika ada file lama, hapus fisik filenya di MinIO agar tidak jadi sampah
    // [UPDATE FEATURE B]: We now keep the old files in MinIO for Audit Trail purposes.
    // if (existing) { ... }

    // 3. Tentukan nama file dan upload ke MinIO (hanya jika ada file baru)
    let filename = existing ? existing.file_url : null;
    let excelFilename = existing ? existing.excel_file_url : null;
    let nama_file_asli = existing ? existing.nama_file_asli : null;
    let nama_excel_file_asli = existing ? existing.nama_excel_file_asli : null;

    const fs = require('fs');

    const path = require('path');

    if (file) {
        // [SEC-L02] Sanitasi nama file menghindari Path Traversal
        const safeFilename = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
        filename = `${tenant.satkerId}/${tahun}/${periodType}/${periodUnit}/${Date.now()}-${safeFilename}`;
        // [SRE-01] Stream dari diskStorage
        const fileStream = fs.createReadStream(file.path);
        await minioClient.putObject(BUCKET_NAME, filename, fileStream, file.size, {
            'Content-Type': file.mimetype
        });
        nama_file_asli = path.basename(file.originalname);
        fs.unlinkSync(file.path); // Hapus tmp
    }

    if (fileExcel) {
        // [SEC-L02] Sanitasi nama file Excel
        const safeExcelFilename = path.basename(fileExcel.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
        excelFilename = `${tenant.satkerId}/${tahun}/${periodType}/${periodUnit}/${Date.now()}-excel-${safeExcelFilename}`;
        const fileStream = fs.createReadStream(fileExcel.path);
        await minioClient.putObject(BUCKET_NAME, excelFilename, fileStream, fileExcel.size, {
            'Content-Type': fileExcel.mimetype
        });
        nama_excel_file_asli = path.basename(fileExcel.originalname);
        fs.unlinkSync(fileExcel.path); // Hapus tmp
    }

    const dataSubmission = {
        satker_id: tenant.satkerId,
        report_type_id: reportTypeId,
        period_type: periodType,
        period_unit: periodUnit,
        periode_tahun: tahun,
        file_url: filename,
        nama_file_asli: nama_file_asli,
        excel_file_url: excelFilename,
        nama_excel_file_asli: nama_excel_file_asli,
        status_verifikasi: 'belum_lengkap', // Reset status jika di-update
        catatan_admin: null,
        updated_at: knex.fn.now()
    };

    let submissionId;
    if (existing) {
        await knex('report_submissions').where({ id: existing.id }).update(dataSubmission);
        submissionId = existing.id;
    } else {
        const [insertedId] = await knex('report_submissions').insert({ ...dataSubmission, created_at: knex.fn.now() }).returning('id');
        submissionId = typeof insertedId === 'object' ? insertedId.id : insertedId;
    }

    // [UPDATE FEATURE B]: Log to report_revision_logs
    await knex('report_revision_logs').insert({
        submission_id: submissionId,
        action_type: existing ? 'REUPLOAD' : 'UPLOAD',
        file_url: filename,
        excel_file_url: excelFilename,
        actor: tenant.role,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
    });

    return submissionId;
}

/**
 * [READ] Generate Tautan Aman (Presigned URL) untuk Preview
 */
async function generatePresignedUrl(submissionId, tenant, type = 'pdf') {
    const submission = await knex('report_submissions').where({ id: submissionId }).first();
    
    if (!submission) throw new AppError('Dokumen tidak ditemukan di database.', 404);
    
    // Proteksi: Satker hanya boleh melihat filenya sendiri
    const pnRoles = ['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN'];
    if (pnRoles.includes(tenant.role) && submission.satker_id !== tenant.satkerId) {
        throw new AppError('Anda tidak memiliki izin mengakses dokumen ini.', 403);
    }

    const fileUrl = type === 'excel' ? submission.excel_file_url : submission.file_url;
    if (!fileUrl) throw new AppError('File tidak ditemukan.', 404);

    // Buat URL yang berlaku hanya selama 1 jam (3600 detik)
    return await minioClient.presignedGetObject(BUCKET_NAME, fileUrl, 3600);
}

/**
 * [READ] Generate Tautan Aman (Presigned URL) untuk Riwayat Dokumen
 */
async function generatePresignedUrlForHistory(historyId, tenant, type = 'pdf') {
    const logEntry = await knex('report_revision_logs').where({ id: historyId }).first();
    
    if (!logEntry) throw new AppError('Riwayat dokumen tidak ditemukan.', 404);
    const fileUrl = type === 'excel' ? logEntry.excel_file_url : logEntry.file_url;
    if (!fileUrl) throw new AppError('File dokumen tidak tersedia pada riwayat ini.', 404);
    
    // Proteksi: Pastikan Satker hanya mengakses laporannya sendiri
    const pnRoles = ['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN'];
    if (pnRoles.includes(tenant.role)) {
        const submission = await knex('report_submissions').where({ id: logEntry.submission_id }).first();
        if (submission && submission.satker_id !== tenant.satkerId) {
            throw new AppError('Anda tidak memiliki izin mengakses dokumen ini.', 403);
        }
    }

    // Buat URL yang berlaku hanya selama 1 jam (3600 detik)
    return await minioClient.presignedGetObject(BUCKET_NAME, fileUrl, 3600);
}

/**
 * [UPDATE] Verifikasi Admin dan Trigger Notifikasi Email via BullMQ
 */
async function verifyAndNotify(tenant, submissionId, status, catatan, score) {
    // 1. Update Status di Database
    await knex('report_submissions').where({ id: submissionId }).update({
        status_verifikasi: status,
        catatan_admin: catatan,
        nilai_angka: score !== undefined ? score : null,
        updated_at: knex.fn.now()
    });

    // [UPDATE FEATURE B]: Log to report_revision_logs
    const actionType = status === 'lengkap' ? 'VERIFY_OK' : (status === 'revisi' ? 'VERIFY_REVISI' : 'VERIFY_LAINNYA');

    // fetch the file_url and satker_id to log which version was verified and send notification
    const submission = await knex('report_submissions as rs')
        .join('report_types as rt', 'rs.report_type_id', 'rt.id')
        .where('rs.id', submissionId)
        .select('rs.file_url', 'rs.satker_id', 'rt.nama_laporan')
        .first();

    await knex('report_revision_logs').insert({
        submission_id: submissionId,
        action_type: actionType,
        catatan: catatan,
        file_url: submission ? submission.file_url : null,
        actor: tenant.role,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
    });

    // 2. Tulis notifikasi in-app
    if (submission && submission.satker_id) {
        let title = status === 'lengkap' ? 'Laporan Diterima' : 'Revisi Laporan';
        let msg = status === 'lengkap' 
            ? `Laporan ${submission.nama_laporan} telah diverifikasi dan disetujui.` 
            : `Laporan ${submission.nama_laporan} perlu direvisi: ${catatan}`;
        if (score !== undefined && score !== null) msg += ` (Nilai: ${score})`;

        await knex('in_app_notifications').insert({
            satker_id: submission.satker_id,
            title: title,
            message: msg,
            is_read: false,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        });
    }

    // 3. Jika statusnya REVISI, masukkan ke antrean email
        if (status === 'revisi') {
        const detail = await knex('users')
            .where('satker_id', submission.satker_id)
            .whereNotNull('email')
            .whereIn('role', ['SATKER_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN'])
            .select('email as satker_email')
            .first();

        if (detail && detail.satker_email) {
            await emailQueue.add('sendRevisionEmail', {
                to: detail.satker_email,
                nama_laporan: submission.nama_laporan,
                catatan_admin: catatan
            }, { attempts: 3, backoff: 5000 });
        }
    }
}

/**
 * [DELETE] Hapus Dokumen Permanen (DB + MinIO)
 */
async function deleteReportDocument(tenant, submissionId) {
    const submission = await knex('report_submissions').where({ id: submissionId }).first();
    
    if (!submission) throw new AppError('Laporan tidak ditemukan.', 404);
    if (submission.satker_id !== tenant.satkerId) throw new AppError('Izin ditolak.', 403);

    // 1. Hapus di MinIO
    await minioClient.removeObject(BUCKET_NAME, submission.file_url);
    
    // 2. Hapus di Database
    return await knex('report_submissions').where({ id: submissionId }).del();
}

module.exports = {
    uploadReportDocument,
    generatePresignedUrl,
    generatePresignedUrlForHistory,
    verifyAndNotify,
    deleteReportDocument
};