const knex = require('../config/knex');

// --- Master ---
async function listActiveItems(filters = {}, trx = knex) {
  let query = trx('monitoring_items').where('is_active', true);
  if (filters.frequency_type) {
    query = query.where('frequency_type', filters.frequency_type);
  }
  return query;
}

async function getItemWithAssignments(itemId, effectiveAt = new Date(), trx = knex) {
  const item = await trx('monitoring_items').where({ id: itemId, is_active: true }).first();
  if (!item) return null;
  
  const assignments = await trx('monitoring_item_assignments')
    .where({ monitoring_item_id: itemId, is_active: true });
  
  item.assignments = assignments;
  return item;
}

async function getEvidenceRequirements(itemId, effectiveAt = new Date(), trx = knex) {
  let query = trx('monitoring_evidence_requirements')
    .where({ monitoring_item_id: itemId });
    
  if (effectiveAt) {
    query = query.where(function() {
      this.whereNull('effective_from').orWhere('effective_from', '<=', effectiveAt);
    }).andWhere(function() {
      this.whereNull('effective_to').orWhere('effective_to', '>=', effectiveAt);
    });
  }
  
  return query.orderBy('sort_order', 'asc');
}

// --- Period ---
async function createPeriod(payload, actorId, trx = knex) {
  const [result] = await trx('monitoring_periods').insert({
    ...payload,
    created_by: actorId
  }).returning('id');
  return result?.id || result;
}

async function getPeriodById(id, trx = knex) {
  return trx('monitoring_periods').where({ id }).first();
}

async function listPeriods(filters = {}, pagination = {}, trx = knex) {
  let query = trx('monitoring_periods');
  if (filters.status) query = query.where('status', filters.status);
  
  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);
  
  return query.orderBy('created_at', 'desc');
}

async function updatePeriod(id, payload, expectedLockVersion = null, trx = knex) {
  return trx('monitoring_periods').where({ id }).update(payload);
}

// --- Generation ---
async function listGenerationCandidates(periodId, trx = knex) {
  const period = await trx('monitoring_periods').where({ id: periodId }).first();
  if (!period) return [];
  
  // Basic matching: in reality we'd match frequency_type to period type
  return trx('monitoring_items').where({ is_active: true });
}

async function findTargetByNaturalKey(naturalKey, trx = knex) {
  return trx('monitoring_targets').where({ natural_key: naturalKey }).first();
}

async function insertTarget(payload, trx = knex) {
  const [result] = await trx('monitoring_targets').insert(payload).returning('*');
  return result;
}

async function insertTargetAssignees(rows, trx = knex) {
  if (!rows || rows.length === 0) return [];
  return trx('monitoring_target_assignees').insert(rows).returning('*');
}

// --- Target ---
async function getTargetById(id, trx = knex) {
  return trx('monitoring_targets').where({ id }).first();
}

async function getTargetDetail(id, trx = knex) {
  const target = await trx('monitoring_targets').where({ id }).first();
  if (!target) return null;
  target.assignees = await trx('monitoring_target_assignees').where({ monitoring_target_id: id });
  target.evidences = await listEvidenceByTarget(id, trx);
  target.follow_ups = await listFollowUpsByTarget(id, trx);
  return target;
}

async function listTargets(filters = {}, pagination = {}, trx = knex) {
  let query = trx('monitoring_targets');
  if (filters.period_id) query = query.where('period_id', filters.period_id);
  if (filters.workflow_status) query = query.where('workflow_status', filters.workflow_status);
  
  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);
  
  return query;
}

async function listTargetsForUser(userId, filters = {}, pagination = {}, trx = knex) {
  let query = trx('monitoring_targets as mt')
    .join('monitoring_target_assignees as mta', 'mt.id', 'mta.monitoring_target_id')
    .where('mta.user_id', userId)
    .select('mt.*');
    
  if (filters.period_id) query = query.where('mt.period_id', filters.period_id);
  
  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);
  
  return query;
}

async function updateTargetState(id, fromStatuses, patch, expectedLockVersion = null, trx = knex) {
  let query = trx('monitoring_targets').where({ id });
  if (fromStatuses) {
    if (Array.isArray(fromStatuses)) query = query.whereIn('workflow_status', fromStatuses);
    else query = query.where('workflow_status', fromStatuses);
  }
  if (expectedLockVersion !== null) {
    query = query.where('lock_version', expectedLockVersion);
  }
  
  const payload = { ...patch };
  if (expectedLockVersion !== null) {
    payload.lock_version = expectedLockVersion + 1;
  }
  
  return query.update(payload);
}

// --- Evidence ---
async function listEvidenceByTarget(targetId, trx = knex) {
  return trx('monitoring_evidences').where({ monitoring_target_id: targetId }).orderBy('version_no', 'desc');
}

async function getLatestEvidence(targetId, requirementId, trx = knex) {
  return trx('monitoring_evidences')
    .where({ monitoring_target_id: targetId, requirement_id: requirementId, evidence_status: 'SUBMITTED' })
    .orderBy('version_no', 'desc')
    .first();
}

async function insertEvidenceVersion(payload, trx = knex) {
  const [result] = await trx('monitoring_evidences').insert(payload).returning('*');
  return result;
}

async function supersedeEvidence(evidenceId, trx = knex) {
  return trx('monitoring_evidences')
    .where({ id: evidenceId })
    .update({ evidence_status: 'SUPERSEDED', superseded_at: knex.fn.now() });
}

async function markEvidenceSubmitted(targetId, trx = knex) {
  return trx('monitoring_evidences')
    .where({ monitoring_target_id: targetId, evidence_status: 'DRAFT' })
    .update({ evidence_status: 'SUBMITTED', updated_at: knex.fn.now() });
}

async function validateEvidenceCompleteness(targetId, trx = knex) {
  const target = await getTargetById(targetId, trx);
  const reqs = await getEvidenceRequirements(target.monitoring_item_id, new Date(), trx);
  
  const evidences = await trx('monitoring_evidences')
    .where({ monitoring_target_id: targetId, evidence_status: 'DRAFT' }); 
    
  const missing = [];
  for (const req of reqs) {
    if (req.is_required) {
      const found = evidences.find(e => e.requirement_id === req.id);
      if (!found) missing.push(req);
    }
  }
  
  return { complete: missing.length === 0, missing }; 
}

// --- Review and audit ---
async function insertVerification(payload, trx = knex) {
  const [result] = await trx('monitoring_target_verifications').insert(payload).returning('*');
  return result;
}

async function listVerificationHistory(targetId, trx = knex) {
  return trx('monitoring_target_verifications').where({ monitoring_target_id: targetId }).orderBy('created_at', 'desc');
}

async function insertActivity(payload, trx = knex) {
  const [result] = await trx('monitoring_target_activities').insert(payload).returning('*');
  return result;
}

async function listActivity(targetId, pagination = {}, trx = knex) {
  let query = trx('monitoring_target_activities').where({ monitoring_target_id: targetId }).orderBy('created_at', 'desc');
  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);
  return query;
}

// --- Follow-up ---
async function createFollowUp(payload, trx = knex) {
  const [result] = await trx('monitoring_follow_ups').insert(payload).returning('*');
  return result;
}

async function listFollowUpsByTarget(targetId, trx = knex) {
  return trx('monitoring_follow_ups').where({ monitoring_target_id: targetId }).orderBy('created_at', 'asc');
}

async function updateFollowUpState(id, fromStatuses, patch, trx = knex) {
  let query = trx('monitoring_follow_ups').where({ id });
  if (fromStatuses) {
    if (Array.isArray(fromStatuses)) query = query.whereIn('status', fromStatuses);
    else query = query.where('status', fromStatuses);
  }
  const updated = await query.update(patch);
  if (updated === 0) {
    const error = new Error('Follow-up tidak dalam status yang valid untuk aksi ini');
    error.statusCode = 400;
    throw error;
  }
  return updated;
}

// --- Dashboard ---
async function getMyDashboard(userId, periodId, filters = {}, trx = knex) {
  // Get all targets assigned to user in period
  const query = trx('monitoring_targets as mt')
    .join('monitoring_target_assignees as mta', 'mt.id', 'mta.monitoring_target_id')
    .where('mt.period_id', periodId)
    .where('mta.user_id', userId);
    
  const targets = await query.select('mt.*');
  
  // Get open follow ups for this user
  const openFollowUps = await trx('monitoring_follow_ups as mfu')
    .join('monitoring_targets as mt', 'mfu.monitoring_target_id', 'mt.id')
    .where('mt.period_id', periodId)
    .where('mfu.owner_user_id', userId)
    .whereIn('mfu.status', ['OPEN', 'IN_PROGRESS', 'REOPENED'])
    .count('* as count').first();

  const now = new Date();
  
  return {
    summary: {
      total: targets.length,
      notStarted: targets.filter(t => t.workflow_status === 'NOT_STARTED').length,
      inProgress: targets.filter(t => t.workflow_status === 'IN_PROGRESS').length,
      awaitingApproval: targets.filter(t => t.workflow_status === 'AWAITING_APPROVAL').length,
      awaitingVerification: targets.filter(t => t.workflow_status === 'AWAITING_VERIFICATION').length,
      revisionRequired: targets.filter(t => t.workflow_status === 'REVISION_REQUIRED').length,
      verified: targets.filter(t => t.workflow_status === 'VERIFIED').length,
      overdue: targets.filter(t => t.workflow_status !== 'VERIFIED' && new Date(t.due_at) < now).length,
      openFollowUps: parseInt(openFollowUps.count) || 0
    },
    urgentTargets: targets.filter(t => t.workflow_status !== 'VERIFIED' && new Date(t.due_at) < now).slice(0, 5),
    recentActivities: []
  };
}

async function getOperationalDashboard(periodId, filters = {}, trx = knex) {
  const summaryRes = await trx('monitoring_targets')
    .where('period_id', periodId)
    .select('workflow_status')
    .count('* as count')
    .groupBy('workflow_status');
    
  let totalTargets = 0;
  let verified = 0;
  let revisionRequired = 0;
  let awaitingVerification = 0;
  
  summaryRes.forEach(row => {
    const c = parseInt(row.count);
    totalTargets += c;
    if (row.workflow_status === 'VERIFIED') verified += c;
    if (row.workflow_status === 'REVISION_REQUIRED') revisionRequired += c;
    if (row.workflow_status === 'AWAITING_VERIFICATION') awaitingVerification += c;
  });

  const now = new Date();
  const overdueRes = await trx('monitoring_targets')
    .where('period_id', periodId)
    .whereNot('workflow_status', 'VERIFIED')
    .where('due_at', '<', now)
    .count('* as count').first();

  const followUpRes = await trx('monitoring_follow_ups as mfu')
    .join('monitoring_targets as mt', 'mfu.monitoring_target_id', 'mt.id')
    .where('mt.period_id', periodId)
    .whereIn('mfu.status', ['OPEN', 'IN_PROGRESS', 'REOPENED', 'AWAITING_VERIFICATION'])
    .count('* as count').first();

  return {
    summary: {
      totalTargets,
      verified,
      overdue: parseInt(overdueRes.count) || 0,
      revisionRequired,
      awaitingVerification,
      openFollowUps: parseInt(followUpRes.count) || 0
    },
    byUnit: [],
    reviewQueue: await listReviewQueue({}, { period_id: periodId }, { limit: 5 }, trx),
    followUpQueue: await listFollowUpQueue({}, { period_id: periodId }, { limit: 5 }, trx)
  };
}

async function getExecutiveDashboard(periodId, filters = {}, trx = knex) {
  const targets = await trx('monitoring_targets').where('period_id', periodId);
  
  let applicableTargets = 0;
  let verified = 0;
  let verifiedOnTime = 0;
  let overdueCount = 0;
  const now = new Date();
  
  targets.forEach(t => {
    if (t.workflow_status !== 'CANCELLED' && t.workflow_status !== 'NOT_APPLICABLE') {
      applicableTargets++;
      
      if (t.workflow_status === 'VERIFIED') {
        verified++;
        // If it was verified, check if verified_at (or just assume for now) <= due_at
        // For simplicity, we check was_submitted_late
        if (!t.was_submitted_late) verifiedOnTime++;
      } else {
        if (new Date(t.due_at) < now) overdueCount++;
      }
    }
  });

  const followUpRes = await trx('monitoring_follow_ups as mfu')
    .join('monitoring_targets as mt', 'mfu.monitoring_target_id', 'mt.id')
    .where('mt.period_id', periodId)
    .whereIn('mfu.status', ['OPEN', 'IN_PROGRESS', 'REOPENED', 'AWAITING_VERIFICATION'])
    .count('* as count').first();

  return {
    complianceRate: applicableTargets ? parseFloat((verified / applicableTargets * 100).toFixed(2)) : 0,
    verifiedOnTimeRate: applicableTargets ? parseFloat((verifiedOnTime / applicableTargets * 100).toFixed(2)) : 0,
    overdueCount,
    openFollowUpCount: parseInt(followUpRes.count) || 0,
    byUnit: [],
    criticalItems: []
  };
}

async function listReviewQueue(actor, filters = {}, pagination = {}, trx = knex) {
  let query = trx('monitoring_targets as mt')
    .select('mt.*')
    .whereIn('mt.workflow_status', ['AWAITING_APPROVAL', 'AWAITING_VERIFICATION'])
    .orderBy('mt.updated_at', 'asc');
    
  if (filters.period_id) query = query.where('mt.period_id', filters.period_id);
  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);
  
  return query;
}

async function listFollowUpQueue(actor, filters = {}, pagination = {}, trx = knex) {
  let query = trx('monitoring_follow_ups as mfu')
    .join('monitoring_targets as mt', 'mfu.monitoring_target_id', 'mt.id')
    .select('mfu.*', 'mt.natural_key')
    .whereIn('mfu.status', ['OPEN', 'IN_PROGRESS', 'REOPENED', 'AWAITING_VERIFICATION'])
    .orderBy('mfu.due_at', 'asc');
    
  if (filters.period_id) query = query.where('mt.period_id', filters.period_id);
  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);
  
  return query;
}


module.exports = {
  listActiveItems,
  getItemWithAssignments,
  getEvidenceRequirements,
  createPeriod,
  getPeriodById,
  listPeriods,
  updatePeriod,
  listGenerationCandidates,
  findTargetByNaturalKey,
  insertTarget,
  insertTargetAssignees,
  getTargetById,
  getTargetDetail,
  listTargets,
  listTargetsForUser,
  updateTargetState,
  listEvidenceByTarget,
  getLatestEvidence,
  insertEvidenceVersion,
  supersedeEvidence,
  markEvidenceSubmitted,
  validateEvidenceCompleteness,
  insertVerification,
  listVerificationHistory,
  insertActivity,
  listActivity,
  createFollowUp,
  listFollowUpsByTarget,
  updateFollowUpState,
  getMyDashboard,
  getOperationalDashboard,
  getExecutiveDashboard,
  listReviewQueue,
  listFollowUpQueue
};
