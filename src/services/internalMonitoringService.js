const repo = require('../repositories/internalMonitoringRepo');
const knex = require('../config/knex');
const authSvc = require('./internalMonitoringAuthorizationService');
const notificationSvc = require('./internalMonitoringNotificationService');
const { assertValidTransition } = require('../domain/internalMonitoringStateMachine');
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

function checkLockVersion(target, payload) {
  if (payload && payload.lockVersion !== undefined) {
    if (target.lock_version !== payload.lockVersion) {
      conflict('VERSION_CONFLICT', 'Data telah berubah (VERSION_CONFLICT). Muat ulang dan coba lagi.');
    }
  }
}

// [REFACTOR-01] Helper untuk duplikasi pengecekan affected rows pada Optimistic Locking
function throwIfVersionConflict(updatedCount) {
  if (updatedCount === 0) {
    conflict('VERSION_CONFLICT', 'Data telah diubah oleh pengguna lain (VERSION_CONFLICT). Muat ulang dan coba lagi.');
  }
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
      
      checkLockVersion(target, payload);

      const allowed = ['NOT_STARTED', 'IN_PROGRESS', 'REVISION_REQUIRED'];
      if (!allowed.includes(target.workflow_status)) {
        badRequest('INVALID_STATE_TRANSITION', 'Hanya bisa save draft pada status NOT_STARTED, IN_PROGRESS, atau REVISION_REQUIRED');
      }
      
      const nextStatus = target.workflow_status === 'NOT_STARTED' ? 'IN_PROGRESS' : target.workflow_status;
      if (nextStatus !== target.workflow_status) {
        assertValidTransition(target.workflow_status, nextStatus);
      }

      await authSvc.assertHasCapability(actor, id, ['COLLECTOR', 'SUPPORTING_PIC'], trx);


      
      const updated = await repo.updateTargetState(id, null, {
        workflow_status: nextStatus,
        updated_by: actor.userId
      }, target.lock_version, trx);

      throwIfVersionConflict(updated);
      
      return { success: true, message: 'Draft saved' };
    });
  }

  async submitTarget(id, actor, payload) {
    try {
      return await knex.transaction(async (trx) => {
        const target = await repo.getTargetDetail(id, trx);
        if (!target) notFound('Target tidak ditemukan');

        checkLockVersion(target, payload);

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

        assertValidTransition(target.workflow_status, nextStatus);

        const wasLate = new Date() > new Date(target.due_at);

        const updated = await repo.updateTargetState(id, null, {
          workflow_status: nextStatus,
          submitted_at: knex.fn.now(),
          was_submitted_late: wasLate,
          updated_by: actor.userId
        }, target.lock_version, trx);

        throwIfVersionConflict(updated);

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

        const approvers = await repo.getAssignees(id, ['APPROVER', 'ACCOUNTABLE_OWNER'], trx);
        const approverIds = approvers.map(a => a.user_id);
        await notificationSvc.notifyTargetSubmitted(target, approverIds, trx);

        return { success: true };
      });
    } catch (err) {
      // Error dicatat oleh global error handler — tidak perlu console.log di sini
      throw err;
    }
  }

  async approveTarget(id, actor, payload) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      checkLockVersion(target, payload);

      assertValidTransition(target.workflow_status, 'AWAITING_VERIFICATION');

      await authSvc.assertHasCapability(actor, id, ['ACCOUNTABLE_OWNER', 'APPROVER'], trx);
      await authSvc.assertSegregationOfDuties(actor, target, 'APPROVE', trx);

      const updated = await repo.updateTargetState(id, null, {
        workflow_status: 'AWAITING_VERIFICATION',
        approved_at: knex.fn.now(),
        updated_by: actor.userId
      }, target.lock_version, trx);

      throwIfVersionConflict(updated);

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.userId,
        action: 'APPROVE',
        description: 'Target disetujui'
      }, trx);

      const verifiers = await repo.getAssignees(id, ['VERIFIER'], trx);
      const verifierIds = verifiers.map(a => a.user_id);
      await notificationSvc.notifyTargetApproved(target, verifierIds, trx);

      return { success: true };
    });
  }


  async batchVerifyTargets(actor, payload) {
    if (!payload.targetIds || !Array.isArray(payload.targetIds) || payload.targetIds.length === 0) {
      badRequest('INVALID_INPUT', 'targetIds array tidak boleh kosong');
    }

    return knex.transaction(async (trx) => {
      let successCount = 0;
      let failedCount = 0;
      const errors = [];

      for (const id of payload.targetIds) {
        try {
          const target = await repo.getTargetDetail(id, trx);
          if (!target) { throw new Error('Target tidak ditemukan'); }

          if (target.workflow_status !== 'AWAITING_VERIFICATION') {
            throw new Error('Status target bukan AWAITING_VERIFICATION');
          }

          await authSvc.assertHasCapability(actor, id, ['VERIFIER'], trx);
          await authSvc.assertSegregationOfDuties(actor, target, 'VERIFY', trx);

          const updated = await repo.updateTargetState(id, null, {
            workflow_status: 'VERIFIED',
            verified_at: knex.fn.now(),
            updated_by: actor.userId
          }, target.lock_version, trx);

          throwIfVersionConflict(updated);

          await repo.insertVerification({
            monitoring_target_id: id,
            actor_user_id: actor.userId,
            action: 'VERIFIED',
            note: payload.note || 'Verified via Batch'
          }, trx);

          await repo.insertActivity({
            monitoring_target_id: id,
            actor_user_id: actor.userId,
            action: 'VERIFY',
            description: 'Target diverifikasi secara massal (Batch): ' + (payload.note || '')
          }, trx);

          const assignees = await repo.getAssignees(id, ['COLLECTOR', 'APPROVER', 'ACCOUNTABLE_OWNER', 'SUPPORTING_PIC'], trx);
          const userIds = assignees.map(a => a.user_id);
          await notificationSvc.notifyTargetVerified(target, userIds, trx);

          successCount++;
        } catch (err) {
          failedCount++;
          errors.push({ id, reason: err.message });
        }
      }

      return { success: true, summary: { successCount, failedCount, errors } };
    });
  }

  async verifyTarget(id, actor, payload) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      checkLockVersion(target, payload);

      assertValidTransition(target.workflow_status, 'VERIFIED');

      await authSvc.assertHasCapability(actor, id, ['VERIFIER'], trx);
      await authSvc.assertSegregationOfDuties(actor, target, 'VERIFY', trx);

      const updated = await repo.updateTargetState(id, null, {
        workflow_status: 'VERIFIED',
        verified_at: knex.fn.now(),
        updated_by: actor.userId
      }, target.lock_version, trx);

      throwIfVersionConflict(updated);

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

      const assignees = await repo.getAssignees(id, ['COLLECTOR', 'APPROVER', 'ACCOUNTABLE_OWNER', 'SUPPORTING_PIC'], trx);
      const userIds = assignees.map(a => a.user_id);
      await notificationSvc.notifyTargetVerified(target, userIds, trx);

      return { success: true, verification };
    });
  }

  async requestRevision(id, actor, payload) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      checkLockVersion(target, payload);

      assertValidTransition(target.workflow_status, 'REVISION_REQUIRED');

      await authSvc.assertHasCapability(actor, id, ['APPROVER', 'VERIFIER', 'ACCOUNTABLE_OWNER'], trx);

      if (!payload.note) badRequest('VALIDATION_ERROR', 'Note revisi wajib diisi');

      const returnStage = target.workflow_status;

      const updated = await repo.updateTargetState(id, null, {
        workflow_status: 'REVISION_REQUIRED',
        current_review_stage: returnStage,
        updated_by: actor.userId
      }, target.lock_version, trx);

      throwIfVersionConflict(updated);

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

      const collectors = await repo.getAssignees(id, ['COLLECTOR'], trx);
      const collectorIds = collectors.map(a => a.user_id);
      await notificationSvc.notifyRevisionRequested(target, collectorIds, payload.note, trx);

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
      
      checkLockVersion(target, payload);

      const requirementId = payload.requirement_id;
      await authSvc.assertCanEditEvidence(actor, target, requirementId, trx);

      const reqs = await repo.getEvidenceRequirements(target.monitoring_item_id, new Date(), trx);
      const req = reqs.find(r => r.id === parseInt(requirementId));
      if (!req) notFound('Requirement tidak valid');

      const incomingType = payload.evidence_type;

      // [Fitur DL10 / Storage Save]: Jika requirement adalah FILE, izinkan upload tipe LINK (GDrive) sebagai alternatif.
      if (incomingType && incomingType !== req.evidence_type) {
        const isLinkAlternative = req.evidence_type === 'FILE' && incomingType === 'LINK';
        if (!isLinkAlternative) {
          badRequest('EVIDENCE_TYPE_MISMATCH', `Tipe evidence harus ${req.evidence_type}`);
        }
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
        throwIfVersionConflict(updated);
      }

      return evidence;
    });
  }

  async uploadEvidenceFile(actor, targetId, requirementId, file, payload) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(targetId, trx);
      if (!target) notFound('Target tidak ditemukan');
      
      checkLockVersion(target, payload);

      await authSvc.assertCanEditEvidence(actor, target, requirementId, trx);

      const reqs = await repo.getEvidenceRequirements(target.monitoring_item_id, new Date(), trx);
      const req = reqs.find(r => r.id === parseInt(requirementId));
      if (!req) notFound('Requirement tidak valid');

      if (req.evidence_type !== 'FILE') {
        badRequest('EVIDENCE_TYPE_MISMATCH', 'Requirement ini tidak menerima tipe FILE');
      }

      // Upload file ke MinIO dengan path terstruktur
      const { minioClient, minioUploadBreaker, BUCKET_NAME } = require('../config/minio');
      const fs = require('fs');
      const path = require('path');
      const ttlSeconds = parseInt(process.env.MONITORING_PRESIGNED_URL_TTL_SECONDS || '3600', 10);

      // [SEC-L02] Sanitasi originalname agar tidak mengandung path traversal (misal: ../../)
      const safeFilename = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const objectKey = `internal/${targetId}/${requirementId}/${Date.now()}_${safeFilename}`;

      // [SRE-01] Stream dari diskStorage (tmp) langsung ke MinIO, bukan membaca ke Buffer
      const fileStream = fs.createReadStream(file.path);

      // [SRE-04] Gunakan Circuit Breaker untuk perlindungan timeout MinIO
      await minioUploadBreaker.fire(BUCKET_NAME, objectKey, fileStream, file.size, {
        'Content-Type': file.mimetype
      });

      // Hapus file dari tmp setelah berhasil diupload
      fs.unlinkSync(file.path);

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
        value_text: file.originalname,
        object_key: objectKey,
        submitted_by: actor.userId,
        evidence_status: 'DRAFT'
      }, trx);
      
      if (target.workflow_status === 'NOT_STARTED') {
        const updated = await repo.updateTargetState(targetId, 'NOT_STARTED', { workflow_status: 'IN_PROGRESS' }, target.lock_version, trx);
        throwIfVersionConflict(updated);
      }

      return evidence;
    });
  }

  async getEvidenceDownloadUrl(actor, targetId, evidenceId) {
    const target = await repo.getTargetDetail(targetId, knex);
    if (!target) notFound('Target tidak ditemukan');

    await authSvc.assertCanViewTarget(actor, target);

    const ev = await knex('monitoring_evidences').where({ id: evidenceId, monitoring_target_id: targetId }).first();
    if (!ev) notFound('Evidence tidak ditemukan');

    if (ev.evidence_type !== 'FILE') {
      badRequest('INVALID_TYPE', 'Evidence bukan berupa file');
    }

    const objectKey = ev.value_text;
    if (!objectKey) notFound('File evidence tidak tersedia');

    // Generate presigned URL dari MinIO (berlaku sesuai TTL dari env)
    const { minioClient, BUCKET_NAME } = require('../config/minio');
    const ttlSeconds = parseInt(process.env.MONITORING_PRESIGNED_URL_TTL_SECONDS || '3600', 10);
    const url = await minioClient.presignedGetObject(BUCKET_NAME, objectKey, ttlSeconds);
    return url;
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

      await repo.insertActivity({
        monitoring_target_id: targetId,
        actor_user_id: actor.userId,
        action: 'CREATE_FOLLOW_UP',
        description: 'Follow up dibuat: ' + payload.title
      }, trx);

      await notificationSvc.notifyFollowUpAssigned(fu, target, trx);

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
