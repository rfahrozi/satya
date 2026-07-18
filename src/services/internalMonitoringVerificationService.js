const knex = require('../config/knex');
class InternalMonitoringError extends Error { constructor(code, message) { super(message); this.code = code; } }
const coverageService = require('./internalMonitoringCoverageService');
const stateMachine = require('../../satya_criterion_assessment_state_machine.json');

class InternalMonitoringVerificationService {
  async buildAssessmentSummary(actor, targetId, trx = knex) {
    const criteria = await trx('monitoring_target_criteria')
      .leftJoin('monitoring_criterion_assessments', 'monitoring_target_criteria.id', 'monitoring_criterion_assessments.target_criterion_id')
      .where('monitoring_target_criteria.monitoring_target_id', targetId)
      .select(
        'monitoring_target_criteria.is_required',
        'monitoring_target_criteria.weight',
        'monitoring_criterion_assessments.status',
        'monitoring_criterion_assessments.score'
      );

    let requiredCount = 0;
    let assessedCount = 0;
    let metCount = 0;
    let partiallyMetCount = 0;
    let notMetCount = 0;
    let notApplicableCount = 0;

    let totalApplicableWeight = 0;
    let totalWeightedScore = 0;

    for (const c of criteria) {
      if (c.is_required) requiredCount++;
      if (c.status && c.status !== 'NOT_ASSESSED') assessedCount++;

      if (c.status === 'MET') {
        metCount++;
        totalApplicableWeight += Number(c.weight);
        totalWeightedScore += (Number(c.weight) * Number(c.score || 1.0));
      } else if (c.status === 'PARTIALLY_MET') {
        partiallyMetCount++;
        totalApplicableWeight += Number(c.weight);
        totalWeightedScore += (Number(c.weight) * Number(c.score || 0.5));
      } else if (c.status === 'NOT_MET') {
        notMetCount++;
        totalApplicableWeight += Number(c.weight);
        totalWeightedScore += (Number(c.weight) * Number(c.score || 0.0));
      } else if (c.status === 'NOT_APPLICABLE') {
        notApplicableCount++;
        // Excluded from denominator
      }
    }

    const weightedScore = totalApplicableWeight > 0 ? (totalWeightedScore / totalApplicableWeight) : 0;
    const compliancePercentage = totalApplicableWeight > 0 ? weightedScore * 100 : 0;

    let decision = 'NOT_APPLICABLE';
    if (totalApplicableWeight > 0) {
      if (compliancePercentage === 100) decision = 'COMPLIANT';
      else if (compliancePercentage > 0) decision = 'PARTIALLY_COMPLIANT';
      else decision = 'NON_COMPLIANT';
    }

    return {
      monitoring_target_id: targetId,
      required_criterion_count: requiredCount,
      assessed_criterion_count: assessedCount,
      met_count: metCount,
      partially_met_count: partiallyMetCount,
      not_met_count: notMetCount,
      not_applicable_count: notApplicableCount,
      weighted_score: Number(weightedScore.toFixed(2)),
      compliance_percentage: Number(compliancePercentage.toFixed(2)),
      decision,
      created_by: actor.id,
      created_at: new Date()
    };
  }

  async verifyTarget(actor, targetId, payload) {
    return knex.transaction(async trx => {
      // 1. Check readiness
      const readiness = await coverageService.getSubmissionReadiness(targetId, trx);
      if (readiness.criteria.assessed < readiness.criteria.required) {
        throw new InternalMonitoringError('INCOMPLETE_ASSESSMENT', 'Not all required criteria have been assessed.');
      }
      
      // Check if evidence and parameters are fully mapped
      if (!readiness.readyToSubmit) {
         throw new InternalMonitoringError('INCOMPLETE_COVERAGE', 'Not all required evidence/parameters are mapped.');
      }

      // 2. Build Assessment Summary
      const summaryPayload = await this.buildAssessmentSummary(actor, targetId, trx);
      
      // Save summary
      const [summaryInsert] = await trx('monitoring_target_assessment_summaries').insert(summaryPayload).returning('id');
      const summaryId = summaryInsert.id || summaryInsert;

      // 3. Mark Verification
      const verificationPayload = {
        assessment_summary_id: summaryId,
        decision: summaryPayload.decision,
        verified_criterion_count: summaryPayload.assessed_criterion_count,
        verification_snapshot_json: JSON.stringify(readiness)
      };

      const existingVerification = await trx('monitoring_target_verifications').where('monitoring_target_id', targetId).first();
      
      let verificationId;
      if (existingVerification) {
        await trx('monitoring_target_verifications').where('id', existingVerification.id).update(verificationPayload);
        verificationId = existingVerification.id;
      } else {
        const [vInsert] = await trx('monitoring_target_verifications').insert({
          monitoring_target_id: targetId,
          actor_user_id: actor.id,
          action: 'VERIFY',
          ...verificationPayload
        }).returning('id');
        verificationId = vInsert.id || vInsert;
      }

      // Update target status
      await trx('monitoring_targets')
        .where('id', targetId)
        .update({ 
          status: 'VERIFIED',
          updated_by: actor.id 
        });

      return { summaryId, verificationId, decision: summaryPayload.decision };
    });
  }

  async createFindingFromCriterion(actor, criterionAssessmentId, payload) {
    return knex.transaction(async trx => {
      const assessment = await trx('monitoring_criterion_assessments').where('id', criterionAssessmentId).first();
      if (!assessment) throw new Error('Assessment not found');
      if (assessment.status === 'MET') {
        throw new InternalMonitoringError('INVALID_STATE', 'Cannot create a finding for a compliant criterion');
      }

      const findingPayload = {
        title: payload.title,
        description: payload.description,
        status: 'OPEN',
        severity: payload.severity || 'MEDIUM',
        created_by: actor.id
      };

      const [finding] = await trx('monitoring_findings').insert(findingPayload).returning('id');
      const findingId = finding.id || finding;

      await trx('monitoring_assessment_findings').insert({
        criterion_assessment_id: criterionAssessmentId,
        finding_id: findingId
      });

      return { id: findingId };
    });
  }
}

module.exports = new InternalMonitoringVerificationService();
