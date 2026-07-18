const knex = require('../config/knex');

class InternalMonitoringRequirementService {
  async instantiateRequirements(targetId, itemId, trx = knex) {
    // Copy parameters
    const params = await trx('monitoring_item_parameters').where('monitoring_item_id', itemId);
    const targetParams = params.map(p => ({
      monitoring_target_id: targetId,
      parameter_id: p.id,
      status: 'DRAFT'
    }));
    if (targetParams.length > 0) {
      await trx('monitoring_target_parameter_values').insert(targetParams);
    }

    // Evidence requirement templates are evaluated at runtime by checking the evidence requirement templates 
    // against the submitted target evidence in the `InternalMonitoringEvidenceService` or during submit,
    // but we can also pre-seed a tracking structure if needed. For now, parameters need pre-seeding.
  }

  async validateEvidenceCoverage(targetId, trx = knex) {
    const target = await trx('monitoring_targets').where('id', targetId).first();
    const requirements = await trx('monitoring_evidence_requirement_templates').where('monitoring_item_id', target.monitoring_item_id);
    
    // Check if each required evidence template has at least one file attached
    // This is a simplified check.
    const attachedEvidence = await trx('monitoring_evidence').where('target_id', targetId);
    
    const errors = [];
    for (const req of requirements) {
      if (req.required) {
        // In a real impl, we link evidence to requirement_code
        // For simplicity, we just assume any attached evidence might satisfy if we don't have mapping.
        // Actually, we should check monitoring_evidence.requirement_code
        const matches = attachedEvidence.filter(e => e.requirement_code === req.requirement_code);
        if (matches.length === 0) {
          errors.push(`Missing required evidence: ${req.label}`);
        }
      }
    }
    return errors;
  }

  async validateParameterCoverage(targetId, trx = knex) {
    const values = await trx('monitoring_target_parameter_values')
      .join('monitoring_item_parameters', 'monitoring_item_parameters.id', 'monitoring_target_parameter_values.parameter_id')
      .where('monitoring_target_id', targetId)
      .select('monitoring_item_parameters.label', 'monitoring_item_parameters.required', 'monitoring_target_parameter_values.*');
    
    const errors = [];
    for (const v of values) {
      if (v.required) {
        if (v.value_text === null && v.value_number === null && v.value_boolean === null && v.value_date === null) {
          errors.push(`Missing required parameter: ${v.label}`);
        }
      }
    }
    return errors;
  }
}

module.exports = new InternalMonitoringRequirementService();
