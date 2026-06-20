const knex = require('../config/knex');
const { AppError } = require('../middlewares/errorHandler');

// --- SATKERS ---

async function getSatkers(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const satkers = await knex('satkers').orderBy('nama_satker');
        res.status(200).json({ success: true, data: satkers });
    } catch (error) { next(error); }
}

async function createSatker(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { nama_satker } = req.body;
        if (!nama_satker) throw new AppError('Nama Satker wajib diisi.', 400);
        await knex('satkers').insert({ nama_satker });
        res.status(201).json({ success: true, message: 'Satker berhasil ditambahkan.' });
    } catch (error) { next(error); }
}

async function updateSatker(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { id } = req.params;
        const { nama_satker } = req.body;
        if (!nama_satker) throw new AppError('Nama Satker wajib diisi.', 400);
        await knex('satkers').where({ id }).update({ nama_satker });
        res.status(200).json({ success: true, message: 'Satker berhasil diperbarui.' });
    } catch (error) { next(error); }
}

async function deleteSatker(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { id } = req.params;
        await knex('satkers').where({ id }).del();
        res.status(200).json({ success: true, message: 'Satker berhasil dihapus.' });
    } catch (error) { next(error); }
}


// --- REPORT TYPES ---

async function getReportTypes(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const reportTypes = await knex('report_types').orderBy('nama_laporan');
        res.status(200).json({ success: true, data: reportTypes });
    } catch (error) { next(error); }
}

async function createReportType(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { nama_laporan, is_wajib } = req.body;
        if (!nama_laporan) throw new AppError('Nama Laporan wajib diisi.', 400);
        await knex('report_types').insert({ nama_laporan, is_wajib: is_wajib !== undefined ? is_wajib : true });
        res.status(201).json({ success: true, message: 'Jenis Laporan berhasil ditambahkan.' });
    } catch (error) { next(error); }
}

async function updateReportType(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { id } = req.params;
        const { nama_laporan, is_wajib } = req.body;
        const updateData = {};
        if (nama_laporan) updateData.nama_laporan = nama_laporan;
        if (is_wajib !== undefined) updateData.is_wajib = is_wajib;
        await knex('report_types').where({ id }).update(updateData);
        res.status(200).json({ success: true, message: 'Jenis Laporan berhasil diperbarui.' });
    } catch (error) { next(error); }
}

async function deleteReportType(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { id } = req.params;
        await knex('report_types').where({ id }).del();
        res.status(200).json({ success: true, message: 'Jenis Laporan berhasil dihapus.' });
    } catch (error) { next(error); }
}


// --- DEADLINE CONFIGS ---

async function getDeadlines(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const deadlines = await knex('deadline_configs')
            .join('report_types', 'deadline_configs.report_type_id', '=', 'report_types.id')
            .select('deadline_configs.*', 'report_types.nama_laporan');
        res.status(200).json({ success: true, data: deadlines });
    } catch (error) { next(error); }
}

async function createDeadline(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { report_type_id, period_type, day_of_period } = req.body;
        if (!report_type_id || !period_type || !day_of_period) {
            throw new AppError('Semua field wajib diisi.', 400);
        }
        await knex('deadline_configs').insert({ report_type_id, period_type, day_of_period });
        res.status(201).json({ success: true, message: 'Deadline berhasil ditambahkan.' });
    } catch (error) { next(error); }
}

async function updateDeadline(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { id } = req.params;
        const { report_type_id, period_type, day_of_period } = req.body;
        const updateData = {};
        if (report_type_id) updateData.report_type_id = report_type_id;
        if (period_type) updateData.period_type = period_type;
        if (day_of_period) updateData.day_of_period = day_of_period;
        
        await knex('deadline_configs').where({ id }).update(updateData);
        res.status(200).json({ success: true, message: 'Deadline berhasil diperbarui.' });
    } catch (error) { next(error); }
}

async function deleteDeadline(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') throw new AppError('Akses ditolak.', 403);
        const { id } = req.params;
        await knex('deadline_configs').where({ id }).del();
        res.status(200).json({ success: true, message: 'Deadline berhasil dihapus.' });
    } catch (error) { next(error); }
}

module.exports = {
    getSatkers, createSatker, updateSatker, deleteSatker,
    getReportTypes, createReportType, updateReportType, deleteReportType,
    getDeadlines, createDeadline, updateDeadline, deleteDeadline
};
