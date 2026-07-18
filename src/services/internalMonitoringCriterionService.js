const knex = require('../config/knex');

class InternalMonitoringCriterionService {
  /**
   * Instantiates criteria for a newly generated target based on its monitoring item's criteria.
   * Runs inside a transaction.
   */
  async instantiateTargetCriteria(targetId, itemSnapshot, trx) {
    if (!itemSnapshot || !itemSnapshot.id) return;

    // Fetch master criteria associated with this item
    const itemCriteria = await trx('monitoring_item_criteria')
      .join('monitoring_source_criteria', 'monitoring_item_criteria.source_criterion_id', 'monitoring_source_criteria.id')
      .where('monitoring_item_criteria.monitoring_item_id', itemSnapshot.id)
      .select(
        'monitoring_source_criteria.id as source_criterion_id',
        'monitoring_source_criteria.criterion_code',
        'monitoring_source_criteria.criterion_text',
        'monitoring_item_criteria.is_primary',
        'monitoring_item_criteria.sort_order'
      );

    if (itemCriteria.length === 0) return;

    const targetCriteria = itemCriteria.map(ic => ({
      monitoring_target_id: targetId,
      source_criterion_id: ic.source_criterion_id,
      criterion_code: ic.criterion_code,
      criterion_text: ic.criterion_text,
      assessment_code: null,
      is_required: ic.is_primary,
      weight: 1.0,
      sort_order: ic.sort_order || 0,
      snapshot_json: JSON.stringify(ic),
      created_at: new Date()
    }));

    // Insert criteria snapshot for the target
    await trx('monitoring_target_criteria').insert(targetCriteria);
  }

  /**
   * Links a submitted evidence file to a specific target criterion.
   */
  async linkEvidence(actor, targetId, criterionId, evidenceId, evidenceVersion, linkType = 'PRIMARY') {
    return knex.transaction(async trx => {
      // Validate criterion belongs to target
      const criterion = await trx('monitoring_target_criteria')
        .where({ id: criterionId, monitoring_target_id: targetId })
        .first();
      if (!criterion) throw new Error('Criterion not found for this target');

      // Validate evidence belongs to target
      const evidence = await trx('monitoring_evidences')
        .where({ id: evidenceId, monitoring_target_id: targetId, version_no: evidenceVersion })
        .first();
      if (!evidence) throw new Error('Evidence not found or version mismatch for this target');

      const [id] = await trx('monitoring_criterion_evidence_links')
        .insert({
          target_criterion_id: criterionId,
          evidence_id: evidenceId,
          evidence_version_no: evidenceVersion,
          link_type: linkType,
          created_by: actor.id
        })
        .returning('id');

      return { id: id.id || id };
    });
  }

  /**
   * Links a submitted parameter to a specific target criterion.
   */
  async linkParameter(actor, targetId, criterionId, targetParameterValueId, parameterVersionNo) {
    return knex.transaction(async trx => {
      // Validate criterion belongs to target
      const criterion = await trx('monitoring_target_criteria')
        .where({ id: criterionId, monitoring_target_id: targetId })
        .first();
      if (!criterion) throw new Error('Criterion not found for this target');

      const [id] = await trx('monitoring_criterion_parameter_links')
        .insert({
          target_criterion_id: criterionId,
          target_parameter_value_id: targetParameterValueId,
          parameter_version_no: parameterVersionNo
        })
        .returning('id');

      return { id: id.id || id };
    });
  }
}

module.exports = new InternalMonitoringCriterionService();
