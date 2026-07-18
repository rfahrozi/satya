const knex = require('../../config/knex');

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

  // byUnit: ringkasan per unit untuk operational dashboard
  const unitSummary = await trx('monitoring_targets as mt')
    .join('internal_units as iu', 'mt.internal_unit_id', 'iu.id')
    .where('mt.period_id', periodId)
    .select(
      'iu.id as unit_id',
      'iu.name as unit_name',
      trx.raw('COUNT(*) as total'),
      trx.raw("COUNT(CASE WHEN mt.workflow_status = 'VERIFIED' THEN 1 END) as verified_count"),
      trx.raw("COUNT(CASE WHEN mt.workflow_status = 'REVISION_REQUIRED' THEN 1 END) as revision_count"),
      trx.raw(`COUNT(CASE WHEN mt.workflow_status != 'VERIFIED' AND mt.due_at < NOW() THEN 1 END) as overdue_count`)
    )
    .groupBy('iu.id', 'iu.name')
    .orderBy('iu.name', 'asc');

  return {
    summary: {
      totalTargets,
      verified,
      overdue: parseInt(overdueRes.count) || 0,
      revisionRequired,
      awaitingVerification,
      openFollowUps: parseInt(followUpRes.count) || 0
    },
    byUnit: unitSummary.map(u => ({
      unit_id:   u.unit_id,
      unit_name: u.unit_name,
      total:     parseInt(u.total) || 0,
      verified:  parseInt(u.verified_count) || 0,
      revision:  parseInt(u.revision_count) || 0,
      overdue:   parseInt(u.overdue_count) || 0
    })),
    reviewQueue:   await listReviewQueue({}, { period_id: periodId }, { limit: 5 }, trx),
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

  // --- byUnit: breakdown progress per unit/bagian internal PT ---
  const unitTargets = await trx('monitoring_targets as mt')
    .join('internal_units as iu', 'mt.internal_unit_id', 'iu.id')
    .where('mt.period_id', periodId)
    .whereNotIn('mt.workflow_status', ['CANCELLED', 'NOT_APPLICABLE'])
    .select(
      'iu.id as unit_id',
      'iu.name as unit_name',
      'iu.code as unit_code',
      trx.raw('COUNT(*) as total'),
      trx.raw("COUNT(CASE WHEN mt.workflow_status = 'VERIFIED' THEN 1 END) as verified"),
      trx.raw("COUNT(CASE WHEN mt.workflow_status = 'VERIFIED' AND mt.was_submitted_late = false THEN 1 END) as verified_on_time"),
      trx.raw(`COUNT(CASE WHEN mt.workflow_status != 'VERIFIED' AND mt.due_at < NOW() THEN 1 END) as overdue`)
    )
    .groupBy('iu.id', 'iu.name', 'iu.code')
    .orderBy('iu.name', 'asc');

  const byUnit = unitTargets.map(u => ({
    unit_id:         u.unit_id,
    unit_name:       u.unit_name,
    unit_code:       u.unit_code,
    total:           parseInt(u.total) || 0,
    verified:        parseInt(u.verified) || 0,
    verified_on_time: parseInt(u.verified_on_time) || 0,
    overdue:         parseInt(u.overdue) || 0,
    compliance_rate: u.total > 0
      ? parseFloat(((parseInt(u.verified) / parseInt(u.total)) * 100).toFixed(2))
      : 0
  }));

  // --- criticalItems: target overdue di semua unit ---
  const criticalItems = await trx('monitoring_targets as mt')
    .leftJoin('monitoring_items as mi', 'mt.monitoring_item_id', 'mi.id')
    .leftJoin('internal_units as iu', 'mt.internal_unit_id', 'iu.id')
    .where('mt.period_id', periodId)
    .whereNot('mt.workflow_status', 'VERIFIED')
    .whereNot('mt.workflow_status', 'CANCELLED')
    .whereNot('mt.workflow_status', 'NOT_APPLICABLE')
    .where('mt.due_at', '<', now)
    .select(
      'mt.id',
      'mt.natural_key',
      'mt.workflow_status',
      'mt.due_at',
      'mi.title as item_title',
      'mi.item_code',
      'iu.name as unit_name'
    )
    .orderBy('mt.due_at', 'asc')
    .limit(10);

  // --- byAssessment: breakdown per kategori (AMPUH/PMPZI/AKIP/REGULASI) ---
  // Ambil semua target periode beserta item_code dari snapshot
  const allTargetsRaw = await trx('monitoring_targets as mt')
    .where('mt.period_id', periodId)
    .whereNotIn('mt.workflow_status', ['CANCELLED', 'NOT_APPLICABLE'])
    .select('mt.workflow_status', 'mt.master_snapshot');

  const byAssessment = { AMPUH: { total: 0, verified: 0 }, PMPZI: { total: 0, verified: 0 }, AKIP: { total: 0, verified: 0 }, REGULASI: { total: 0, verified: 0 } };

  for (const t of allTargetsRaw) {
    let snap = {};
    try { snap = JSON.parse(t.master_snapshot || '{}'); } catch (e) {}
    const code = snap.item_code || '';

    let key = null;
    if (code.startsWith('AMP-'))  key = 'AMPUH';
    else if (code.startsWith('PZ-'))   key = 'PMPZI';
    else if (code.startsWith('AKIP-')) key = 'AKIP';
    else if (code.startsWith('REG-'))  key = 'REGULASI';

    if (key) {
      byAssessment[key].total++;
      if (t.workflow_status === 'VERIFIED') byAssessment[key].verified++;
    }
  }

  return {
    complianceRate:    applicableTargets ? parseFloat((verified / applicableTargets * 100).toFixed(2)) : 0,
    verifiedOnTimeRate: applicableTargets ? parseFloat((verifiedOnTime / applicableTargets * 100).toFixed(2)) : 0,
    overdueCount,
    openFollowUpCount: parseInt(followUpRes.count) || 0,
    totalItems: applicableTargets,
    byUnit,
    byAssessment,
    criticalItems
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
  getMyDashboard,
  getOperationalDashboard,
  getExecutiveDashboard,
  listReviewQueue,
  listFollowUpQueue
};
