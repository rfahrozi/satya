const repo = require('../repositories/internalMonitoringRepo');
const knex = require('../config/knex');

function forbidden(msg = 'Akses ditolak') {
  const err = new Error(msg);
  err.code = 'FORBIDDEN';
  err.statusCode = 403;
  throw err;
}

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

// Check authorization capabilities
function hasCapability(target, userId, capabilities) {
  if (!target.assignees) return false;
  return target.assignees.some(a => a.user_id === userId && capabilities.includes(a.capability));
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

      if (actor.role !== 'ADMIN_PT' && !hasCapability(target, actor.id, ['COLLECTOR', 'SUPPORTING_PIC'])) {
        forbidden('Hanya Collector yang dapat menyimpan draft');
      }

      const nextStatus = target.workflow_status === 'NOT_STARTED' ? 'IN_PROGRESS' : target.workflow_status;
      
      await repo.updateTargetState(id, null, {
        workflow_status: nextStatus,
        updated_by: actor.id
      }, target.lock_version, trx);
      
      return { success: true, message: 'Draft saved' };
    });
  }

  async submitTarget(id, actor) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      if (!['IN_PROGRESS', 'REVISION_REQUIRED'].includes(target.workflow_status)) {
        badRequest('INVALID_STATE_TRANSITION', 'Submit hanya dari IN_PROGRESS atau REVISION_REQUIRED');
      }

      if (actor.role !== 'ADMIN_PT' && !hasCapability(target, actor.id, ['COLLECTOR'])) {
        forbidden('Hanya Collector yang dapat submit target');
      }

      // Validate evidence completeness
      const validation = await repo.validateEvidenceCompleteness(id, trx);
      if (!validation.complete) {
        badRequest('EVIDENCE_INCOMPLETE', 'Bukti wajib belum lengkap');
      }

      const nextStatus = target.workflow_status === 'REVISION_REQUIRED' && target.current_review_stage 
                         ? target.current_review_stage 
                         : 'AWAITING_APPROVAL';

      const wasLate = new Date() > new Date(target.due_at);

      await repo.updateTargetState(id, null, {
        workflow_status: nextStatus,
        submitted_at: knex.fn.now(),
        was_submitted_late: wasLate,
        updated_by: actor.id
      }, target.lock_version, trx);

      // Lock draft evidences
      await trx('monitoring_evidences')
        .where({ monitoring_target_id: id, evidence_status: 'DRAFT' })
        .update({ evidence_status: 'SUBMITTED' });

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.id,
        action: 'SUBMIT',
        description: 'Target disubmit'
      }, trx);

      return { success: true };
    });
  }

  async approveTarget(id, actor) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');

      if (target.workflow_status !== 'AWAITING_APPROVAL') {
        badRequest('INVALID_STATE_TRANSITION', 'Hanya dapat approve dari AWAITING_APPROVAL');
      }

      // SOD check
      const isCollector = hasCapability(target, actor.id, ['COLLECTOR']);
      const isApprover = hasCapability(target, actor.id, ['ACCOUNTABLE_OWNER', 'APPROVER']);
      
      if (actor.role !== 'ADMIN_PT') {
        if (!isApprover) forbidden('Hanya Approver yang dapat menyetujui');
        if (isCollector) {
          await logSodOverride(trx, id, actor.id, 'APPROVE', 'Collector melakukan approve sendiri');
          // for slice, we let it pass with an override log, or fail? "Exception harus dicatat sebagai SOD_OVERRIDE" implies it passes but is logged.
        }
      }

      await repo.updateTargetState(id, null, {
        workflow_status: 'AWAITING_VERIFICATION',
        approved_at: knex.fn.now(),
        updated_by: actor.id
      }, target.lock_version, trx);

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.id,
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

      const isCollector = hasCapability(target, actor.id, ['COLLECTOR']);
      const isVerifier = hasCapability(target, actor.id, ['VERIFIER']);
      
      if (actor.role !== 'ADMIN_PT') {
        if (!isVerifier) forbidden('Hanya Verifier yang dapat memverifikasi');
        if (isCollector) {
          await logSodOverride(trx, id, actor.id, 'VERIFY', 'Collector memverifikasi target sendiri');
        }
      }

      await repo.updateTargetState(id, null, {
        workflow_status: 'VERIFIED',
        verified_at: knex.fn.now(),
        updated_by: actor.id
      }, target.lock_version, trx);

      const verification = await repo.insertVerification({
        monitoring_target_id: id,
        actor_user_id: actor.id,
        action: 'VERIFIED',
        note: payload.note || ''
      }, trx);

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.id,
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

      if (actor.role !== 'ADMIN_PT' && !hasCapability(target, actor.id, ['APPROVER', 'VERIFIER', 'ACCOUNTABLE_OWNER'])) {
        forbidden('Hanya Approver atau Verifier yang dapat meminta revisi');
      }

      if (!payload.note) badRequest('VALIDATION_ERROR', 'Note revisi wajib diisi');

      const returnStage = target.workflow_status;

      await repo.updateTargetState(id, null, {
        workflow_status: 'REVISION_REQUIRED',
        current_review_stage: returnStage,
        updated_by: actor.id
      }, target.lock_version, trx);

      await repo.insertVerification({
        monitoring_target_id: id,
        actor_user_id: actor.id,
        action: 'REVISION_REQUIRED',
        note: payload.note
      }, trx);

      await repo.insertActivity({
        monitoring_target_id: id,
        actor_user_id: actor.id,
        action: 'REQUEST_REVISION',
        description: 'Meminta revisi: ' + payload.note
      }, trx);

      return { success: true };
    });
  }

  async addEvidence(id, requirementId, payload, actor) {
    return knex.transaction(async (trx) => {
      const target = await repo.getTargetDetail(id, trx);
      if (!target) notFound('Target tidak ditemukan');
      
      if (!['NOT_STARTED', 'IN_PROGRESS', 'REVISION_REQUIRED'].includes(target.workflow_status)) {
        badRequest('INVALID_STATE_TRANSITION', 'Tidak dapat upload evidence pada status ini');
      }

      if (actor.role !== 'ADMIN_PT' && !hasCapability(target, actor.id, ['COLLECTOR', 'SUPPORTING_PIC'])) {
        forbidden('Hanya Collector yang dapat menambah evidence');
      }

      const reqs = await repo.getEvidenceRequirements(target.monitoring_item_id, new Date(), trx);
      const req = reqs.find(r => r.id === parseInt(requirementId));
      if (!req) notFound('Requirement tidak valid');

      // Versioning
      const existingVersions = await trx('monitoring_evidences')
        .where({ monitoring_target_id: id, requirement_id: requirementId });
      
      const newVersionNo = existingVersions.length > 0 ? Math.max(...existingVersions.map(e => e.version_no)) + 1 : 1;

      // Supersede older drafts if they exist
      await trx('monitoring_evidences')
        .where({ monitoring_target_id: id, requirement_id: requirementId, evidence_status: 'DRAFT' })
        .update({ evidence_status: 'SUPERSEDED', superseded_at: knex.fn.now() });

      const evidence = await repo.insertEvidenceVersion({
        monitoring_target_id: id,
        requirement_id: requirementId,
        version_no: newVersionNo,
        evidence_type: req.evidence_type,
        ...payload,
        submitted_by: actor.id,
        evidence_status: 'DRAFT'
      }, trx);
      
      // Auto-update target status to IN_PROGRESS if NOT_STARTED
      if (target.workflow_status === 'NOT_STARTED') {
        await repo.updateTargetState(id, null, { workflow_status: 'IN_PROGRESS' }, target.lock_version, trx);
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

      if (actor.role !== 'ADMIN_PT' && !hasCapability(target, actor.id, ['VERIFIER'])) {
        forbidden('Hanya Verifier yang dapat membuat follow-up');
      }

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
            const target = await repo.getTargetDetail(fu.monitoring_target_id, trx);
            if (!hasCapability(target, actor.id, ['VERIFIER'])) forbidden('Hanya Verifier yang dapat close follow-up');
          }
          break;
        case 'reopen':
          fromStatuses = ['AWAITING_VERIFICATION'];
          nextStatus = 'REOPENED';
          if (actor.role !== 'ADMIN_PT') {
            const target = await repo.getTargetDetail(fu.monitoring_target_id, trx);
            if (!hasCapability(target, actor.id, ['VERIFIER'])) forbidden('Hanya Verifier yang dapat reopen follow-up');
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
