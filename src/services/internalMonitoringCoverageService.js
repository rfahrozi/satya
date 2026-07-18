const knex = require('../config/knex');

class InternalMonitoringCoverageService {
  async getEvidenceCoverage(targetId, trx = knex) {
    // Required evidence from master requirement templates instantiated to target
    const requiredEvidence = await trx('monitoring_evidences')
      .join('monitoring_evidence_requirements', 'monitoring_evidences.requirement_id', 'monitoring_evidence_requirements.id')
      .where('monitoring_evidences.monitoring_target_id', targetId)
      .andWhere('monitoring_evidence_requirements.is_required', true)
      .countDistinct('monitoring_evidence_requirements.id as required')
      .first();

    const required = parseInt(requiredEvidence.required || 0, 10);

    const completedEvidence = await trx('monitoring_evidences')
      .join('monitoring_evidence_requirements', 'monitoring_evidences.requirement_id', 'monitoring_evidence_requirements.id')
      .where('monitoring_evidences.monitoring_target_id', targetId)
      .andWhere('monitoring_evidence_requirements.is_required', true)
      .andWhere('monitoring_evidences.evidence_status', 'SUBMITTED')
      .countDistinct('monitoring_evidence_requirements.id as completed')
      .first();

    const completed = parseInt(completedEvidence.completed || 0, 10);
    const percentage = required === 0 ? 100 : (completed / required) * 100;

    return {
      required,
      completed,
      percentage: Number(percentage.toFixed(2))
    };
  }

  async getParameterCoverage(targetId, trx = knex) {
    // If we have target parameters
    const requiredParams = await trx('monitoring_target_parameter_values')
      .join('monitoring_item_parameters', 'monitoring_target_parameter_values.parameter_id', 'monitoring_item_parameters.id')
      .where('monitoring_target_parameter_values.monitoring_target_id', targetId)
      .andWhere('monitoring_item_parameters.required', true)
      .countDistinct('monitoring_item_parameters.id as required')
      .first();

    const required = parseInt(requiredParams ? requiredParams.required : 0, 10);

    const completedParams = await trx('monitoring_target_parameter_values')
      .join('monitoring_item_parameters', 'monitoring_target_parameter_values.parameter_id', 'monitoring_item_parameters.id')
      .where('monitoring_target_parameter_values.monitoring_target_id', targetId)
      .andWhere('monitoring_item_parameters.required', true)
      .whereNot('monitoring_target_parameter_values.status', 'DRAFT')
      .countDistinct('monitoring_item_parameters.id as completed')
      .first();

    const completed = parseInt(completedParams ? completedParams.completed : 0, 10);
    const percentage = required === 0 ? 100 : (completed / required) * 100;

    return {
      required,
      completed,
      percentage: Number(percentage.toFixed(2))
    };
  }

  async getCriterionCoverage(targetId, trx = knex) {
    const requiredCriteria = await trx('monitoring_target_criteria')
      .where({ monitoring_target_id: targetId, is_required: true })
      .count('id as required')
      .first();

    const required = parseInt(requiredCriteria.required || 0, 10);

    const assessedCriteria = await trx('monitoring_target_criteria')
      .leftJoin('monitoring_criterion_assessments', 'monitoring_target_criteria.id', 'monitoring_criterion_assessments.target_criterion_id')
      .where('monitoring_target_criteria.monitoring_target_id', targetId)
      .andWhere('monitoring_target_criteria.is_required', true)
      .andWhere('monitoring_criterion_assessments.status', '!=', 'NOT_ASSESSED')
      .count('monitoring_target_criteria.id as assessed')
      .first();

    const assessed = parseInt(assessedCriteria.assessed || 0, 10);

    const mappedCriteria = await trx('monitoring_target_criteria')
      .leftJoin('monitoring_criterion_evidence_links', 'monitoring_target_criteria.id', 'monitoring_criterion_evidence_links.target_criterion_id')
      .where('monitoring_target_criteria.monitoring_target_id', targetId)
      .andWhere('monitoring_target_criteria.is_required', true)
      .whereNotNull('monitoring_criterion_evidence_links.id')
      .countDistinct('monitoring_target_criteria.id as mapped')
      .first();

    const mapped = parseInt(mappedCriteria.mapped || 0, 10);

    return {
      required,
      mapped,
      assessed
    };
  }

  async getSubmissionReadiness(targetId, trx = knex) {
    const evidence = await this.getEvidenceCoverage(targetId, trx);
    const parameters = await this.getParameterCoverage(targetId, trx);
    const criteria = await this.getCriterionCoverage(targetId, trx);

    const blockingIssues = [];
    if (evidence.percentage < 100) {
      blockingIssues.push({ code: 'REQUIRED_EVIDENCE_MISSING' });
    }
    if (parameters.percentage < 100) {
      blockingIssues.push({ code: 'REQUIRED_PARAMETERS_MISSING' });
    }

    const readyToSubmit = blockingIssues.length === 0;

    return {
      evidence,
      parameters,
      criteria,
      readyToSubmit,
      blockingIssues
    };
  }
}

module.exports = new InternalMonitoringCoverageService();
