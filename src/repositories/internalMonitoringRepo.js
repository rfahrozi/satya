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
  return query.update(patch);
}

// --- Dashboard ---
async function getMySummary(userId, periodId, trx = knex) {
  const targets = await listTargetsForUser(userId, { period_id: periodId }, {}, trx);
  return {
    total: targets.length,
    verified: targets.filter(t => t.workflow_status === 'VERIFIED').length,
    in_progress: targets.filter(t => t.workflow_status === 'IN_PROGRESS' || t.workflow_status === 'REVISION_REQUIRED').length,
    awaiting: targets.filter(t => t.workflow_status === 'AWAITING_APPROVAL' || t.workflow_status === 'AWAITING_VERIFICATION').length
  };
}

async function getOperationalSummary(periodId, trx = knex) {
  const res = await trx('monitoring_targets')
    .where('period_id', periodId)
    .select('workflow_status')
    .count('* as count')
    .groupBy('workflow_status');
    
  return res.reduce((acc, row) => {
    acc[row.workflow_status] = parseInt(row.count);
    return acc;
  }, {});
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
  validateEvidenceCompleteness,
  insertVerification,
  listVerificationHistory,
  insertActivity,
  listActivity,
  createFollowUp,
  listFollowUpsByTarget,
  updateFollowUpState,
  getMySummary,
  getOperationalSummary
};
