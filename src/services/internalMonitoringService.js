const repo = require('../repositories/internalMonitoringRepo');
const knex = require('../config/knex');
const authSvc = require('./internalMonitoringAuthorizationService');
const { AppError } = require('../middlewares/errorHandler');

function badRequest(code, msg) {
  const err = new Error(msg);
  err.code = code;
  err.statusCode = 400;
  throw err;
}

function notFound(msg) {
  const err = new Error(msg);
  err.code = 'NOT_FOUND';
  err.statusCode = 404;
  throw err;
}

function conflict(code, msg) {
  const err = new Error(msg);
  err.code = code;
  err.statusCode = 409;
  throw err;
}

function logSodOverride(trx, targetId, actorId, action, notes) {
  return repo.insertActivity({
    monitoring_target_id: targetId,
    actor_user_id: actorId,
    action: `SOD_OVERRIDE_${action}`,
    description: notes
  }, trx);
}

class InternalMonitoringService {
  async getTarget(id, actor) {
    const target = await repo.getTargetDetail(id, knex);
    if (!target) notFound('Target tidak ditemukan');
    return target;
  }
  
  async saveDraft(id, payload, actor) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');
      
      const allowed = ['NOT_STARTED', 'IN_PROGRESS', 'REVISION_REQUIRED'];
      if (!allowed.includes(target.workflow_status)) {
        badRequest('INVALID_STATE_TRANSITION', 'Hanya bisa save draft pada status NOT_STARTED, IN_PROGRESS, atau REVISION_REQUIRED');
      }

      await authSvc.assertHasCapability(actor, id, ['COLLECTOR', 'SUPPORTING_PIC'], trx);

      const nextStatus = target.workflow_status === 'NOT_STARTED' ? 'IN_PROGRESS' : target.workflow_status;
      
      const updated = await repo.updateTargetState(id, null, {
        workflow_status: nextStatus,
        updated_by: actor.userId
      }, target.lock_version, trx);
      
      if (updated === 0) {
        const error = new Error('Data telah diubah oleh pengguna lain (VERSION_CONFLICT). Muat ulang dan coba lagi.');
        error.statusCode = 409;
        throw error;
      }
      
      return { success: true, message: 'Draft saved' };
    });
  }

  async submitTarget(id, actor) {
    try {
      return await knex.transaction(async (trx) => {
        const target = await repo.getTargetDetail(id, trx);
        if (!target) notFound('Target tidak ditemukan');

        if (!['IN_PROGRESS', 'REVISION_REQUIRED'].includes(target.workflow_status)) {
          badRequest('INVALID_STATE_TRANSITION', 'Submit hanya dari IN_PROGRESS atau REVISION_REQUIRED');
        }

        await authSvc.assertHasCapability(actor, id, ['COLLECTOR'], trx);

        // Validate evidence completeness
        const requirements = await repo.getEvidenceRequirements(target.monitoring_item_id, target.period_id ? new Date() : new Date(), trx); // Use a stable date conceptually
        
        for (const req of requirements) {
          if (req.is_required) {
            const latest = target.evidences.find(e => e.requirement_id === req.id && ['DRAFT', 'SUBMITTED', 'VERIFIED'].includes(e.evidence_status));
            if (!latest) {
               badRequest('EVIDENCE_INCOMPLETE', `Bukti wajib belum lengkap: ${req.label}`);
            }
          }
        }

        const nextStatus = target.workflow_status === 'REVISION_REQUIRED' && target.current_review_stage 
                           ? target.current_review_stage 
                           : 'AWAITING_APPROVAL';

        const wasLate = new Date() > new Date(target.due_at);

        const updated = await repo.updateTargetState(id, null, {
          workflow_status: nextStatus,
          submitted_at: knex.fn.now(),
          was_submitted_late: wasLate,
          updated_by: actor.userId
        }, target.lock_version, trx);

        if (updated === 0) {
          const error = new Error('Data telah diubah oleh pengguna lain (VERSION_CONFLICT). Muat ulang dan coba lagi.');
          error.statusCode = 409;
          throw error;
        }

        // Lock draft evidences
        await trx('monitoring_evidences')
          .where({ monitoring_target_id: id, evidence_status: 'DRAFT' })
          .update({ evidence_status: 'SUBMITTED' });

        await repo.insertActivity({
          monitoring_target_id: id,
          actor_user_id: actor.userId,
          action: 'SUBMIT',
          description: 'Target disubmit'
        }, trx);

        return { success: true };
      });
    } catch (err) {
      console.log('SUBMIT TARGET THREW ERROR:', err);
      throw err;
    }
  }

  async approveTarget(id, actor) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      if (target.workflow_status !== 'AWAITING_APPROVAL') {
        badRequest('INVALID_STATE_TRANSITION', 'Hanya dapat approve dari AWAITING_APPROVAL');
      }

      await authSvc.assertHasCapability(actor, id, ['ACCOUNTABLE_OWNER', 'APPROVER'], trx);
      await authSvc.assertSegregationOfDuties(actor, target, 'APPROVE', trx);

      const updated = await repo.updateTargetState(id, null, {
        workflow_status: 'AWAITING_VERIFICATION',
        approved_at: knex.fn.now(),
        updated_by: actor.userId
      }, target.lock_version, trx);

      if (updated === 0) {
        const error = new Error('Data telah diubah oleh pengguna lain (VERSION_CONFLICT). Muat ulang dan coba lagi.');
        error.statusCode = 409;
        throw error;
      }

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.userId,
        action: 'APPROVE',
        description: 'Target disetujui'
      }, trx);

      return { success: true };
    });
  }

  async verifyTarget(id, actor, payload) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      if (target.workflow_status !== 'AWAITING_VERIFICATION') {
        badRequest('INVALID_STATE_TRANSITION', 'Hanya dapat verify dari AWAITING_VERIFICATION');
      }

      await authSvc.assertHasCapability(actor, id, ['VERIFIER'], trx);
      await authSvc.assertSegregationOfDuties(actor, target, 'VERIFY', trx);

      const updated = await repo.updateTargetState(id, null, {
        workflow_status: 'VERIFIED',
        verified_at: knex.fn.now(),
        updated_by: actor.userId
      }, target.lock_version, trx);

      if (updated === 0) {
        const error = new Error('Data telah diubah oleh pengguna lain (VERSION_CONFLICT). Muat ulang dan coba lagi.');
        error.statusCode = 409;
        throw error;
      }

      const verification = await repo.insertVerification({
        monitoring_target_id: id,
        actor_user_id: actor.userId,
        action: 'VERIFIED',
        note: payload.note || ''
      }, trx);

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.userId,
        action: 'VERIFY',
        description: 'Target diverifikasi: ' + (payload.note || '')
      }, trx);

      return { success: true, verification };
    });
  }

  async requestRevision(id, actor, payload) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      if (!['AWAITING_APPROVAL', 'AWAITING_VERIFICATION'].includes(target.workflow_status)) {
        badRequest('INVALID_STATE_TRANSITION', 'Hanya dapat revisi dari Approval atau Verification');
      }

      await authSvc.assertHasCapability(actor, id, ['APPROVER', 'VERIFIER', 'ACCOUNTABLE_OWNER'], trx);

      if (!payload.note) badRequest('VALIDATION_ERROR', 'Note revisi wajib diisi');

      const returnStage = target.workflow_status;

      const updated = await repo.updateTargetState(id, null, {
        workflow_status: 'REVISION_REQUIRED',
        current_review_stage: returnStage,
        updated_by: actor.userId
      }, target.lock_version, trx);

      if (updated === 0) {
        const error = new Error('Data telah diubah oleh pengguna lain (VERSION_CONFLICT). Muat ulang dan coba lagi.');
        error.statusCode = 409;
        throw error;
      }

      await repo.insertVerification({
        monitoring_target_id: id,
        actor_user_id: actor.userId,
        action: 'REVISION_REQUIRED',
        note: payload.note
      }, trx);

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.userId,
        action: 'REQUEST_REVISION',
        description: 'Meminta revisi: ' + payload.note
      }, trx);

      return { success: true };
    });
  }

  async listTargetEvidence(actor, targetId) {
    const target = await repo.getTargetDetail(targetId, knex);
    if (!target) notFound('Target tidak ditemukan');
    await authSvc.assertCanViewTarget(actor, target);
    
    return repo.listEvidenceByTarget(targetId, knex);
  }

  async saveEvidence(actor, targetId, payload) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(targetId, trx);
      if (!target) notFound('Target tidak ditemukan');
      
      const requirementId = payload.requirement_id;
      await authSvc.assertCanEditEvidence(actor, target, requirementId, trx);

      const reqs = await repo.getEvidenceRequirements(target.monitoring_item_id, new Date(), trx);
      const req = reqs.find(r => r.id === parseInt(requirementId));
      if (!req) notFound('Requirement tidak valid');
      
      if (payload.evidence_type && payload.evidence_type !== req.evidence_type) {
        badRequest('EVIDENCE_TYPE_MISMATCH', `Tipe evidence harus ${req.evidence_type}`);
      }

      // Versioning
      const existingVersions = await trx('monitoring_evidences')
        .where({ monitoring_target_id: targetId, requirement_id: requirementId });
      
      const newVersionNo = existingVersions.length > 0 ? Math.max(...existingVersions.map(e => e.version_no)) + 1 : 1;

      // Supersede older drafts if they exist
      await trx('monitoring_evidences')
        .where({ monitoring_target_id: targetId, requirement_id: requirementId, evidence_status: 'DRAFT' })
        .update({ evidence_status: 'SUPERSEDED', superseded_at: knex.fn.now() });

      const evidence = await repo.insertEvidenceVersion({
        monitoring_target_id: targetId,
        requirement_id: requirementId,
        version_no: newVersionNo,
        evidence_type: req.evidence_type,
        value_text: payload.value_text,
        value_number: payload.value_number,
        value_date: payload.value_date,
        value_boolean: payload.value_boolean,
        submitted_by: actor.userId,
        evidence_status: 'DRAFT'
      }, trx);
      
      // Auto-update target status to IN_PROGRESS if NOT_STARTED
      if (target.workflow_status === 'NOT_STARTED') {
        const updated = await repo.updateTargetState(targetId, 'NOT_STARTED', { workflow_status: 'IN_PROGRESS' }, target.lock_version, trx);
        if (updated === 0) conflict('VERSION_CONFLICT', 'Lock version mismatch saat auto-update ke IN_PROGRESS');
      }

      return evidence;
    });
  }

  async uploadEvidenceFile(actor, targetId, requirementId, file) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(targetId, trx);
      if (!target) notFound('Target tidak ditemukan');
      
      await authSvc.assertCanEditEvidence(actor, target, requirementId, trx);

      const reqs = await repo.getEvidenceRequirements(target.monitoring_item_id, new Date(), trx);
      const req = reqs.find(r => r.id === parseInt(requirementId));
      if (!req) notFound('Requirement tidak valid');

      if (req.evidence_type !== 'FILE') {
        badRequest('EVIDENCE_TYPE_MISMATCH', 'Requirement ini tidak menerima tipe FILE');
      }

      // TODO: actual file upload to MinIO to get ID/URL, here we just simulate
      const fileSubmissionId = null;

      // Versioning
      const existingVersions = await trx('monitoring_evidences')
        .where({ monitoring_target_id: targetId, requirement_id: requirementId });
      
      const newVersionNo = existingVersions.length > 0 ? Math.max(...existingVersions.map(e => e.version_no)) + 1 : 1;

      // Supersede older drafts
      await trx('monitoring_evidences')
        .where({ monitoring_target_id: targetId, requirement_id: requirementId, evidence_status: 'DRAFT' })
        .update({ evidence_status: 'SUPERSEDED', superseded_at: knex.fn.now() });

      const evidence = await repo.insertEvidenceVersion({
        monitoring_target_id: targetId,
        requirement_id: requirementId,
        version_no: newVersionNo,
        evidence_type: 'FILE',
        value_text: file.originalname, // Save filename as text
        file_submission_id: fileSubmissionId,
        submitted_by: actor.userId,
        evidence_status: 'DRAFT'
      }, trx);
      
      if (target.workflow_status === 'NOT_STARTED') {
        const updated = await repo.updateTargetState(targetId, 'NOT_STARTED', { workflow_status: 'IN_PROGRESS' }, target.lock_version, trx);
        if (updated === 0) conflict('VERSION_CONFLICT', 'Lock version mismatch saat auto-update ke IN_PROGRESS');
      }

      return evidence;
    });
  }

  // --- Follow-ups ---
  async listFollowUps(targetId, actor) {
    return repo.listFollowUpsByTarget(targetId, knex);
  }

  async createFollowUp(targetId, payload, actor) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(targetId, trx);
      if (!target) notFound('Target tidak ditemukan');

      await authSvc.assertHasCapability(actor, targetId, ['VERIFIER'], trx);

      const fu = await repo.createFollowUp({
        monitoring_target_id: targetId,
        title: payload.title,
        description: payload.description || '',
        owner_user_id: payload.owner_user_id,
        due_at: payload.due_at,
        status: 'OPEN',
        created_by: actor.id
      }, trx);

      return fu;
    });
  }

  async changeFollowUpStatus(fuId, action, payload, actor) {
    return knex.transaction(async (trx) => {
      const fu = await trx('monitoring_follow_ups').where({ id: fuId }).first();
      if (!fu) notFound('Follow-up tidak ditemukan');

      let nextStatus;
      let fromStatuses = [];

      switch (action) {
        case 'start':
          fromStatuses = ['OPEN', 'REOPENED'];
          nextStatus = 'IN_PROGRESS';
          if (actor.id !== fu.owner_user_id && actor.role !== 'ADMIN_PT') forbidden('Hanya owner yang dapat start follow up');
          break;
        case 'submit-resolution':
          fromStatuses = ['IN_PROGRESS'];
          nextStatus = 'AWAITING_VERIFICATION';
          if (actor.id !== fu.owner_user_id && actor.role !== 'ADMIN_PT') forbidden('Hanya owner yang dapat resolve');
          break;
        case 'close':
          fromStatuses = ['AWAITING_VERIFICATION'];
          nextStatus = 'CLOSED';
          if (actor.role !== 'ADMIN_PT') {
            await authSvc.assertHasCapability(actor, fu.monitoring_target_id, ['VERIFIER'], trx);
          }
          break;
        case 'reopen':
          fromStatuses = ['AWAITING_VERIFICATION'];
          nextStatus = 'REOPENED';
          if (actor.role !== 'ADMIN_PT') {
            await authSvc.assertHasCapability(actor, fu.monitoring_target_id, ['VERIFIER'], trx);
          }
          break;
        default:
          badRequest('INVALID_ACTION', 'Action tidak dikenali');
      }

      const patch = { status: nextStatus };
      if (action === 'submit-resolution') patch.resolution_note = payload.resolution_note;
      if (action === 'submit-resolution') patch.submitted_at = knex.fn.now();
      if (action === 'close') patch.closed_at = knex.fn.now();

      await repo.updateFollowUpState(fuId, fromStatuses, patch, trx);
      
      return { success: true };
    });
  }
}

module.exports = new InternalMonitoringService();
