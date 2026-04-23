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
async function uploadReportDocument(tenant, file, reportTypeId, periodType, periodUnit, tahun) {
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
    if (existing) {
        try {
            await minioClient.removeObject(BUCKET_NAME, existing.file_url);
        } catch (err) {
            console.warn('⚠️ [MinIO] Gagal menghapus file lama, mungkin sudah terhapus manual.');
        }
    }

    // 3. Tentukan nama file unik (Path: SatkerID/Tahun/periodType/periodUnit/Timestamp-NamaFile)
    const filename = `${tenant.satkerId}/${tahun}/${periodType}/${periodUnit}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

    // 4. Upload ke MinIO
    await minioClient.putObject(BUCKET_NAME, filename, file.buffer, file.size, {
        'Content-Type': file.mimetype
    });

    const dataSubmission = {
        satker_id: tenant.satkerId,
        report_type_id: reportTypeId,
        period_type: periodType,
        period_unit: periodUnit,
        periode_tahun: tahun,
        file_url: filename,
        nama_file_asli: file.originalname,
        status_verifikasi: 'belum_lengkap', // Reset status jika di-update
        catatan_admin: null,
        updated_at: knex.fn.now()
    };

    if (existing) {
        return await knex('report_submissions').where({ id: existing.id }).update(dataSubmission);
    } else {
        return await knex('report_submissions').insert({ ...dataSubmission, created_at: knex.fn.now() });
    }
}

/**
 * [READ] Generate Tautan Aman (Presigned URL) untuk Preview
 */
async function generatePresignedUrl(submissionId, tenant) {
    const submission = await knex('report_submissions').where({ id: submissionId }).first();
    
    if (!submission) throw new AppError('Dokumen tidak ditemukan di database.', 404);
    
    // Proteksi: Satker hanya boleh melihat filenya sendiri
    if (tenant.role === 'SATKER_PN' && submission.satker_id !== tenant.satkerId) {
        throw new AppError('Anda tidak memiliki izin mengakses dokumen ini.', 403);
    }

    // Buat URL yang berlaku hanya selama 1 jam (3600 detik)
    return await minioClient.presignedGetObject(BUCKET_NAME, submission.file_url, 3600);
}

/**
 * [UPDATE] Verifikasi Admin dan Trigger Notifikasi Email via BullMQ
 */
async function verifyAndNotify(submissionId, status, catatan) {
    // 1. Update Status di Database
    await knex('report_submissions').where({ id: submissionId }).update({
        status_verifikasi: status,
        catatan_admin: catatan,
        updated_at: knex.fn.now()
    });

    // 2. Jika statusnya REVISI, masukkan ke antrean email
    if (status === 'revisi') {
        const detail = await knex('report_submissions as rs')
            .join('report_types as rt', 'rs.report_type_id', 'rt.id')
            .join('users as u', 'rs.satker_id', 'u.satker_id')
            .select('rt.nama_laporan', 'u.email as satker_email')
            .where('rs.id', submissionId)
            .first();

        if (detail) {
            await emailQueue.add('sendRevisionEmail', {
                to: detail.satker_email,
                nama_laporan: detail.nama_laporan,
                catatan_admin: catatan
            }, { attempts: 3, backoff: 5000 }); // Coba lagi 3x jika gagal
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
    verifyAndNotify,
    deleteReportDocument
};