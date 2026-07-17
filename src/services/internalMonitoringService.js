const repo = require('../repositories/internalMonitoringRepo');
const validator = require('../validators/internalMonitoringValidator');
const reportService = require('./reportService');

function ok(message, data, meta) {
  return { success: true, message, data, ...(meta ? { meta } : {}) };
}

function notFound(entity = 'Resource') {
  const error = new Error(`${entity} not found`);
  error.statusCode = 404;
  throw error;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function buildReportTenant(user = {}) {
  return {
    role: user.role,
    satkerId: user.satkerId || user.satker_id || null,
    userId: user.id || null,
  };
}

class InternalMonitoringService {
  async listUnits(query = {}) {
    const filters = { ...validator.validatePagination(query), ...query };
    const { rows, meta } = await repo.listUnits(filters);
    return ok('Internal units fetched successfully', rows, meta);
  }
  async getUnitById(id) { const row = await repo.getById('internal_units', id); if (!row) notFound('Internal unit'); return ok('Internal unit fetched successfully', row); }
  async createUnit(payload) { const row = await repo.create('internal_units', payload); return ok('Internal unit created successfully', row); }
  async updateUnit(id, payload) { const row = await repo.update('internal_units', id, payload); if (!row) notFound('Internal unit'); return ok('Internal unit updated successfully', row); }
  async deleteUnit(id) { const row = await repo.softDelete('internal_units', id); if (!row) notFound('Internal unit'); return ok('Internal unit deleted successfully', row); }

  async listPositions(query = {}) { const filters = { ...validator.validatePagination(query), ...query }; const { rows, meta } = await repo.listPositions(filters); return ok('Positions fetched successfully', rows, meta); }
  async getPositionById(id) { const row = await repo.getById('positions', id); if (!row) notFound('Position'); return ok('Position fetched successfully', row); }
  async createPosition(payload) { const row = await repo.create('positions', payload); return ok('Position created successfully', row); }
  async updatePosition(id, payload) { const row = await repo.update('positions', id, payload); if (!row) notFound('Position'); return ok('Position updated successfully', row); }
  async deletePosition(id) { const row = await repo.softDelete('positions', id); if (!row) notFound('Position'); return ok('Position deleted successfully', row); }

  async listAssignments(query = {}) { const filters = { ...validator.validatePagination(query), ...query }; const { rows, meta } = await repo.listAssignments(filters); return ok('Assignments fetched successfully', rows, meta); }
  async createAssignment(payload) { const row = await repo.create('internal_assignments', payload); return ok('Assignment created successfully', row); }
  async updateAssignment(id, payload) { const row = await repo.update('internal_assignments', id, payload); if (!row) notFound('Assignment'); return ok('Assignment updated successfully', row); }
  async deleteAssignment(id) { const row = await repo.softDelete('internal_assignments', id); if (!row) notFound('Assignment'); return ok('Assignment deleted successfully', row); }

  async listPackages(query = {}) { const filters = { ...validator.validatePagination(query), ...query }; const { rows, meta } = await repo.listPackages(filters); return ok('Monitoring packages fetched successfully', rows, meta); }
  async getPackageById(id) { const row = await repo.getById('monitoring_packages', id); if (!row) notFound('Monitoring package'); return ok('Monitoring package fetched successfully', row); }
  async createPackage(payload) { const row = await repo.create('monitoring_packages', payload); return ok('Monitoring package created successfully', row); }
  async updatePackage(id, payload) { const row = await repo.update('monitoring_packages', id, payload); if (!row) notFound('Monitoring package'); return ok('Monitoring package updated successfully', row); }
  async deletePackage(id) { const row = await repo.softDelete('monitoring_packages', id); if (!row) notFound('Monitoring package'); return ok('Monitoring package deleted successfully', row); }

  async listItems(query = {}) { const filters = { ...validator.validatePagination(query), ...query }; const { rows, meta } = await repo.listItems(filters); return ok('Monitoring items fetched successfully', rows, meta); }
  async getItemById(id) { const row = await repo.getById('monitoring_items', id); if (!row) notFound('Monitoring item'); return ok('Monitoring item fetched successfully', row); }
  async createItem(payload) { const row = await repo.create('monitoring_items', payload); return ok('Monitoring item created successfully', row); }
  async updateItem(id, payload) { const row = await repo.update('monitoring_items', id, payload); if (!row) notFound('Monitoring item'); return ok('Monitoring item updated successfully', row); }
  async deleteItem(id) { const row = await repo.softDelete('monitoring_items', id); if (!row) notFound('Monitoring item'); return ok('Monitoring item deleted successfully', row); }

  async listItemAssignments(query = {}) { const filters = { ...validator.validatePagination(query), ...query }; const { rows, meta } = await repo.listItemAssignments(filters); return ok('Item assignments fetched successfully', rows, meta); }
  async createItemAssignment(payload) { const row = await repo.create('monitoring_item_assignments', payload); return ok('Item assignment created successfully', row); }
  async updateItemAssignment(id, payload) { const row = await repo.update('monitoring_item_assignments', id, payload); if (!row) notFound('Item assignment'); return ok('Item assignment updated successfully', row); }
  async deleteItemAssignment(id) { const row = await repo.softDelete('monitoring_item_assignments', id); if (!row) notFound('Item assignment'); return ok('Item assignment deleted successfully', row); }

  async listPeriods(query = {}) { const filters = { ...validator.validatePagination(query), ...query }; const { rows, meta } = await repo.listPeriods(filters); return ok('Monitoring periods fetched successfully', rows, meta); }
  async getPeriodById(id) { const row = await repo.getPeriodById(id); if (!row) notFound('Monitoring period'); return ok('Monitoring period fetched successfully', row); }
  async createPeriod(payload, user) { const row = await repo.create('monitoring_periods', { ...payload, created_by: user?.id || null }); return ok('Monitoring period created successfully', row); }
  async updatePeriod(id, payload) { const row = await repo.update('monitoring_periods', id, payload); if (!row) notFound('Monitoring period'); return ok('Monitoring period updated successfully', row); }
  async openPeriod(id) { const row = await repo.update('monitoring_periods', id, { status: 'OPEN', opened_at: new Date() }); if (!row) notFound('Monitoring period'); return ok('Monitoring period opened successfully', row); }
  async closePeriod(id) { const row = await repo.update('monitoring_periods', id, { status: 'CLOSED', closed_at: new Date() }); if (!row) notFound('Monitoring period'); return ok('Monitoring period closed successfully', row); }

  async listTargets(query = {}) { const filters = { ...validator.validatePagination(query), ...query }; const { rows, meta } = await repo.listTargets(filters); return ok('Monitoring targets fetched successfully', rows, meta); }
  async listMyTargets(query = {}, user) { const filters = { ...validator.validatePagination(query), ...query, assigned_user_id: user?.id }; const { rows, meta } = await repo.listTargets(filters); return ok('My monitoring targets fetched successfully', rows, meta); }
  async getTargetById(id) { const row = await repo.getTargetById(id); if (!row) notFound('Monitoring target'); return ok('Monitoring target fetched successfully', row); }

  async reassignTarget(id, payload, user) {
    const row = await repo.update('monitoring_targets', id, payload);
    if (!row) notFound('Monitoring target');
    await repo.createActivity({ monitoring_target_id: id, actor_user_id: user?.id || null, action: 'TARGET_REASSIGNED', description: payload.reason || 'Target reassigned', payload });
    return ok('Monitoring target assignment updated successfully', row);
  }

  async refreshStatuses(payload = {}, user) {
    await repo.createActivity({ monitoring_target_id: null, actor_user_id: user?.id || null, action: 'BULK_STATUS_REFRESH', description: 'Bulk status refresh triggered', payload });
    return ok('Monitoring target statuses refreshed successfully', { updated_count: 0, overdue_count: 0 });
  }

  async saveDraft(id, payload, user) {
    const row = await repo.update('monitoring_targets', id, payload);
    if (!row) notFound('Monitoring target');
    await repo.createActivity({ monitoring_target_id: id, actor_user_id: user?.id || null, action: 'DRAFT_SAVED', description: 'Draft metadata saved', payload });
    return ok('Monitoring draft saved successfully', row);
  }

  async uploadTargetDocument(id, req, user) {
    const target = await repo.getTargetById(id);
    if (!target) notFound('Monitoring target');

    const reportType = await repo.getInternalReportTypeByMonitoringItem(target.monitoring_item_id);
    if (!reportType) badRequest('Report type untuk monitoring item ini belum dikonfigurasi.');

    const file = req.files && req.files.dokumen_monev ? req.files.dokumen_monev[0] : null;
    const fileExcel = req.files && req.files.dokumen_excel ? req.files.dokumen_excel[0] : null;
    if (!file && !fileExcel) badRequest('Minimal satu file (PDF atau Excel/Word) harus diunggah.');

    const tenant = buildReportTenant(user);
    const periodType = target.period_month ? 'monthly' : (target.period_quarter ? 'quarterly' : 'annually');
    const periodUnit = String(target.period_month || target.period_quarter || 1);
    const tahun = String(target.period_year);

    const submissionId = await reportService.uploadReportDocument(
      tenant,
      file,
      fileExcel,
      reportType.id,
      periodType,
      periodUnit,
      tahun
    );

    const row = await repo.updateReportSubmission(submissionId, {
      scope_type: 'PT_INTERNAL',
      internal_unit_id: target.internal_unit_id,
      position_id: target.position_id,
      monitoring_target_id: Number(id),
      submitted_by_user_id: user?.id || null,
      submission_context: {
        source: 'internal-monitoring',
        monitoring_target_id: Number(id),
        monitoring_item_id: target.monitoring_item_id,
        item_code: target.item_code,
        notes: req.body?.notes || null,
      },
    });

    await repo.update('monitoring_targets', id, {
      latest_report_id: submissionId,
      status: 'UNDER_REVIEW',
      assigned_user_id: target.assigned_user_id || user?.id || null,
    });

    await repo.createActivity({
      monitoring_target_id: id,
      actor_user_id: user?.id || null,
      action: 'DOCUMENT_UPLOADED',
      description: 'Document uploaded to target',
      payload: { notes: req.body?.notes || null, report_id: submissionId },
    });

    return ok('Monitoring document uploaded successfully', {
      target_id: Number(id),
      report_id: submissionId,
      status: 'UNDER_REVIEW',
      submitted_by_user_id: user?.id || null,
      file_received: Boolean(file),
      excel_received: Boolean(fileExcel),
      submission: row,
    });
  }

  async reuploadTargetDocument(id, req, user) {
    const response = await this.uploadTargetDocument(id, req, user);
    if (response?.data?.target_id) {
      await repo.createActivity({
        monitoring_target_id: response.data.target_id,
        actor_user_id: user?.id || null,
        action: 'DOCUMENT_REUPLOADED',
        description: 'Document reuploaded to target',
        payload: { notes: req.body?.notes || null, report_id: response.data.report_id },
      });
    }
    response.message = 'Monitoring document reuploaded successfully';
    return response;
  }

  async getSubmissions(id) {
    const target = await repo.getTargetById(id);
    if (!target) notFound('Monitoring target');
    const rows = await repo.getSubmissionHistoryByTarget(id);
    const data = rows.map((row, index) => ({
      id: row.id,
      report_id: row.report_id,
      version: rows.length - index,
      action_type: row.action_type,
      file_url: row.file_url,
      excel_file_url: row.excel_file_url,
      file_name: row.nama_file_asli,
      excel_file_name: row.nama_excel_file_asli,
      status: row.status_verifikasi,
      notes: row.notes,
      actor: row.actor,
      created_at: row.created_at,
    }));
    return ok('Submission history fetched successfully', data);
  }

  async downloadLatest(id, user) {
    const target = await repo.getTargetById(id);
    if (!target) notFound('Monitoring target');
    const latest = await repo.getLatestSubmissionByTarget(id);
    if (!latest) notFound('Dokumen');

    const tenant = buildReportTenant(user);
    const downloadUrl = await reportService.generatePresignedUrl(latest.id, tenant, 'pdf');

    return ok('Download URL generated successfully', {
      report_id: latest.id,
      download_url: downloadUrl,
    });
  }

  async verifyTarget(id, payload, user) {
    const target = await repo.getTargetById(id);
    if (!target) notFound('Monitoring target');
    const latest = await repo.getLatestSubmissionByTarget(id);
    if (!latest) badRequest('Belum ada submission untuk diverifikasi.');

    const tenant = buildReportTenant(user);
    await reportService.verifyAndNotify(
      tenant,
      latest.id,
      'lengkap',
      payload.verification_note || null,
      payload.score !== undefined ? payload.score : null
    );

    const row = await repo.update('monitoring_targets', id, {
      status: 'VERIFIED',
      score: payload.score || null,
      grade: payload.grade || null,
      verified_by: user?.id || null,
      verified_at: new Date(),
      remarks: payload.verification_note || null,
      latest_report_id: latest.id,
    });

    await repo.createVerification({
      monitoring_target_id: id,
      actor_user_id: user?.id || null,
      action: 'VERIFIED',
      note: payload.verification_note,
      score: payload.score || null,
      grade: payload.grade || null,
      payload,
    });

    await repo.createActivity({
      monitoring_target_id: id,
      actor_user_id: user?.id || null,
      action: 'TARGET_VERIFIED',
      description: payload.verification_note,
      payload,
    });

    return ok('Monitoring target verified successfully', row);
  }

  async requestRevision(id, payload, user) {
    const current = await repo.getTargetById(id);
    if (!current) notFound('Monitoring target');
    const latest = await repo.getLatestSubmissionByTarget(id);
    if (!latest) badRequest('Belum ada submission untuk direvisi.');

    const tenant = buildReportTenant(user);
    await reportService.verifyAndNotify(
      tenant,
      latest.id,
      'revisi',
      payload.revision_note,
      payload.score !== undefined ? payload.score : null
    );

    const revision_count = Number(current.revision_count || 0) + 1;
    const row = await repo.update('monitoring_targets', id, {
      status: 'REVISION_REQUIRED',
      revision_count,
      remarks: payload.revision_note,
      latest_report_id: latest.id,
    });

    await repo.createVerification({
      monitoring_target_id: id,
      actor_user_id: user?.id || null,
      action: 'REVISION_REQUIRED',
      note: payload.revision_note,
      revision_due_date: payload.due_date || null,
      payload,
    });

    await repo.createActivity({
      monitoring_target_id: id,
      actor_user_id: user?.id || null,
      action: 'REVISION_REQUESTED',
      description: payload.revision_note,
      payload,
    });

    return ok('Revision requested successfully', row);
  }

  async rejectSubmission(id, payload, user) {
    const target = await repo.getTargetById(id);
    if (!target) notFound('Monitoring target');
    const latest = await repo.getLatestSubmissionByTarget(id);
    if (!latest) badRequest('Belum ada submission untuk ditolak.');

    const tenant = buildReportTenant(user);
    await reportService.verifyAndNotify(tenant, latest.id, 'revisi', payload.reason, null);

    const row = await repo.update('monitoring_targets', id, {
      status: 'REJECTED',
      remarks: payload.reason,
      latest_report_id: latest.id,
    });

    await repo.createVerification({
      monitoring_target_id: id,
      actor_user_id: user?.id || null,
      action: 'REJECTED',
      note: payload.reason,
      payload,
    });

    await repo.createActivity({
      monitoring_target_id: id,
      actor_user_id: user?.id || null,
      action: 'SUBMISSION_REJECTED',
      description: payload.reason,
      payload,
    });

    return ok('Monitoring submission rejected successfully', row);
  }

  async getVerificationHistory(id) {
    const target = await repo.getTargetById(id);
    if (!target) notFound('Monitoring target');
    const rows = await repo.listVerificationsByTarget(id);
    return ok('Verification history fetched successfully', rows);
  }

  async getActivityLog(id) {
    const target = await repo.getTargetById(id);
    if (!target) notFound('Monitoring target');
    const rows = await repo.listActivitiesByTarget(id);
    return ok('Activity log fetched successfully', rows);
  }

  async getGlobalActivityLog(query = {}) {
    const filters = { ...validator.validatePagination(query), ...query };
    const { rows, meta } = await repo.getGlobalActivities(filters);
    return ok('Global activity log fetched successfully', rows, meta);
  }
}

module.exports = new InternalMonitoringService();
