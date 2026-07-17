const knex = require('../config/knex');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Validates if the actor can view the target
 */
async function assertCanViewTarget(actor, target) {
  if (['ADMIN_PT', 'PIMPINAN_PT'].includes(actor.role)) return true;
  
  // Checks if user is in assignees
  if (!target.assignees) {
    target.assignees = await knex('monitoring_target_assignees')
      .where({ monitoring_target_id: target.id });
  }

  const isAssigned = target.assignees.some(a => a.user_id === actor.userId);
  if (!isAssigned) {
    throw new AppError('Anda tidak memiliki akses ke target monitoring ini.', 403, 'FORBIDDEN');
  }
  return true;
}

/**
 * Validates if the actor has one of the requested capabilities
 * capabilities = ['COLLECTOR', 'APPROVER', 'VERIFIER', 'ACCOUNTABLE_OWNER']
 */
async function assertHasCapability(actor, targetId, capabilities, trx = knex) {
  if (actor.role === 'ADMIN_PT') return true;

  const assignees = await trx('monitoring_target_assignees')
    .where({ monitoring_target_id: targetId, user_id: actor.userId });
    
  const hasCap = assignees.some(a => capabilities.includes(a.capability));
  if (!hasCap) {
    throw new AppError(`Aksi ditolak. Membutuhkan salah satu peran: ${capabilities.join(', ')}`, 403, 'FORBIDDEN');
  }
  return true;
}

/**
 * Validates if the actor can edit evidence
 */
async function assertCanEditEvidence(actor, target, requirementId, trx = knex) {
  if (actor.role === 'ADMIN_PT') return true;

  const terminalStates = ['AWAITING_APPROVAL', 'AWAITING_VERIFICATION', 'VERIFIED', 'CANCELLED', 'NOT_APPLICABLE'];
  if (terminalStates.includes(target.workflow_status)) {
    throw new AppError('Evidence tidak dapat diubah pada status target saat ini.', 403, 'FORBIDDEN');
  }

  // Ensure actor is COLLECTOR or SUPPORTING_PIC assigned to this requirement
  const assignees = await trx('monitoring_target_assignees')
    .where({ monitoring_target_id: target.id, user_id: actor.userId });

  const isCollector = assignees.some(a => a.capability === 'COLLECTOR' || a.capability === 'PRIMARY');
  if (isCollector) return true;

  const isSupporting = assignees.some(a => a.capability === 'SUPPORTING_PIC');
  if (isSupporting) {
    // In a real system, we might check if requirement is explicitly assigned to this PIC
    return true;
  }

  throw new AppError('Anda tidak memiliki izin mengubah evidence ini.', 403, 'FORBIDDEN');
}

/**
 * Segregation of Duties check
 */
async function assertSegregationOfDuties(actor, target, action, trx = knex) {
  if (action === 'APPROVE') {
    // Check if actor was the submitter by looking at activity log
    const submitActivity = await trx('monitoring_target_activities')
      .where({ monitoring_target_id: target.id, action: 'SUBMIT' })
      .orderBy('created_at', 'desc')
      .first();

    if (submitActivity && submitActivity.actor_user_id === actor.userId) {
      throw new AppError('SOD Violation: Submitter tidak boleh melakukan Approval pada target yang sama.', 403, 'SOD_VIOLATION');
    }
  }

  if (action === 'VERIFY') {
    const submitActivity = await trx('monitoring_target_activities')
      .where({ monitoring_target_id: target.id, action: 'SUBMIT' })
      .orderBy('created_at', 'desc')
      .first();

    if (submitActivity && submitActivity.actor_user_id === actor.userId) {
      throw new AppError('SOD Violation: Submitter tidak boleh melakukan Verifikasi pada target yang sama.', 403, 'SOD_VIOLATION');
    }

    const approveActivity = await trx('monitoring_target_activities')
      .where({ monitoring_target_id: target.id, action: 'APPROVE' })
      .orderBy('created_at', 'desc')
      .first();

    if (approveActivity && approveActivity.actor_user_id === actor.userId) {
      // unless SOD override
      throw new AppError('SOD Violation: Approver tidak boleh melakukan Verifikasi pada target yang sama tanpa SOD Override.', 403, 'SOD_VIOLATION');
    }
  }

  return true;
}

module.exports = {
  assertCanViewTarget,
  assertHasCapability,
  assertCanEditEvidence,
  assertSegregationOfDuties
};
