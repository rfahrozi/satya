const knex = require('../../config/knex');

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
    .leftJoin('internal_units', 'monitoring_item_assignments.internal_unit_id', 'internal_units.id')
    .leftJoin('positions', 'monitoring_item_assignments.position_id', 'positions.id')
    .select('monitoring_item_assignments.*', 'internal_units.name as internal_unit_name', 'positions.name as position_name')
    .where({ monitoring_item_id: itemId, 'monitoring_item_assignments.is_active': true });

  const criteria = await trx('monitoring_item_criteria as mic')
    .join('monitoring_source_criteria as msc', 'mic.source_criterion_id', 'msc.id')
    .join('monitoring_source_assessments as msa', 'msc.assessment_id', 'msa.id')
    .where('mic.monitoring_item_id', itemId)
    .select('msc.criterion_code', 'msc.criterion_text', 'msa.code as assessment_code');

  const requirements = await trx('monitoring_evidence_requirement_templates')
    .where({ monitoring_item_id: itemId })
    .orderBy('sort_order', 'asc');

  item.assignments = assignments;
  item.criteria = criteria;
  item.requirements = requirements;
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

async function listGenerationCandidates(periodId, trx = knex) {
  const period = await trx('monitoring_periods').where({ id: periodId }).first();
  if (!period) return [];
  return trx('monitoring_items').where({ is_active: true });
}

module.exports = {
  listActiveItems,
  getItemWithAssignments,
  getEvidenceRequirements,
  createPeriod,
  getPeriodById,
  listPeriods,
  updatePeriod,
  listGenerationCandidates
};
