const knex = require('../../config/knex');
const { listEvidenceByTarget } = require('./evidenceRepo');


async function findTargetByNaturalKey(naturalKey, trx = knex) {
  return trx('monitoring_targets').where({ natural_key: naturalKey }).first();
}

async function insertTarget(payload, trx = knex) {
  const result = await trx('monitoring_targets')
    .insert(payload)
    .onConflict('natural_key')
    .ignore()
    .returning('*');
  return result[0];
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

  // Return hasil parsed snapshot agar field seperti unit_name dan requirements diisi
  const parsed = await _parseTargetSnapshots([target]);
  return parsed[0];
}

async function _parseTargetSnapshots(targets) {
  return targets.map(t => {
    let master = {};
    let assignment = {};

    // Postgres JSONB type is already parsed into Object by Knex/pg driver
    if (typeof t.master_snapshot === 'object' && t.master_snapshot !== null) {
        master = t.master_snapshot;
    } else {
        try { master = JSON.parse(t.master_snapshot || '{}'); } catch(e){}
    }

    if (typeof t.assignment_snapshot === 'object' && t.assignment_snapshot !== null) {
        assignment = t.assignment_snapshot;
    } else {
        try { assignment = JSON.parse(t.assignment_snapshot || '{}'); } catch(e){}
    }

    return {
      ...t,
      monitoring_item_title: master.title || null,
      item_code: master.item_code || null,
      criteria: master.criteria || [],
      requirements: master.requirements || [],
      unit_name: assignment.internal_unit_name || null,
      position_name: assignment.position_name || null,
      master_snapshot: undefined,
      assignment_snapshot: undefined
    };
  });
}

async function listTargets(filters = {}, pagination = {}, trx = knex) {
  let query = trx('monitoring_targets');
  if (filters.period_id) query = query.where('period_id', filters.period_id);
  if (filters.workflow_status) query = query.where('workflow_status', filters.workflow_status);

  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);

  const targets = await query;
  return _parseTargetSnapshots(targets);
}

async function listTargetsForUser(userId, filters = {}, pagination = {}, trx = knex) {
  let query = trx('monitoring_targets as mt')
    .join('monitoring_target_assignees as mta', 'mt.id', 'mta.monitoring_target_id')
    .where('mta.user_id', userId)
    .select('mt.*');

  if (filters.period_id) query = query.where('mt.period_id', filters.period_id);

  if (pagination.limit) query = query.limit(pagination.limit);
  if (pagination.offset) query = query.offset(pagination.offset);

  const targets = await query;
  return _parseTargetSnapshots(targets);
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

async function getAssignees(targetId, capabilities, trx = knex) {
  let query = trx('monitoring_target_assignees').where('monitoring_target_id', targetId);
  if (capabilities && capabilities.length > 0) {
    query = query.whereIn('capability', capabilities);
  }
  return query;
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


module.exports = {
  findTargetByNaturalKey,
  insertTarget,
  insertTargetAssignees,
  getTargetById,
  getTargetDetail,
  _parseTargetSnapshots,
  listTargets,
  listTargetsForUser,
  updateTargetState,
  getAssignees,
  insertVerification,
  listVerificationHistory,
  insertActivity,
  listActivity,
  createFollowUp,
  listFollowUpsByTarget,
  updateFollowUpState
};
