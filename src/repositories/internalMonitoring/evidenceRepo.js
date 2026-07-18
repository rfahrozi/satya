const knex = require('../../config/knex');

async function listEvidenceByTarget(targetId, trx = knex) {
  return trx('monitoring_evidences').where({ monitoring_target_id: targetId }).orderBy('created_at', 'desc');
}

async function getLatestEvidence(targetId, requirementId, trx = knex) {
  return trx('monitoring_evidences')
    .where({ monitoring_target_id: targetId, requirement_id: requirementId })
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
    .update({ superseded_at: knex.fn.now() });
}

async function markEvidenceSubmitted(targetId, trx = knex) {
  return trx('monitoring_evidences')
    .where({ monitoring_target_id: targetId, evidence_status: 'DRAFT' })
    .update({ evidence_status: 'SUBMITTED' });
}

async function validateEvidenceCompleteness(targetId, trx = knex) {
  const target = await trx('monitoring_targets').where({ id: targetId }).first();
  if (!target) return { is_complete: false, missing_requirements: [] };

  const reqs = await trx('monitoring_evidence_requirements')
    .where({ monitoring_item_id: target.monitoring_item_id });

  const evs = await listEvidenceByTarget(targetId, trx);

  const missing = [];
  for (const req of reqs) {
    if (req.is_required) {
      const hasValid = evs.some(e => e.requirement_id === req.id && ['DRAFT', 'SUBMITTED', 'VERIFIED'].includes(e.evidence_status));
      if (!hasValid) missing.push(req.code);
    }
  }

  return { is_complete: missing.length === 0, missing_requirements: missing };
}

module.exports = {
  listEvidenceByTarget,
  getLatestEvidence,
  insertEvidenceVersion,
  supersedeEvidence,
  markEvidenceSubmitted,
  validateEvidenceCompleteness
};
