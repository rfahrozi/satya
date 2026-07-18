const knex = require('../config/knex');
class InternalMonitoringError extends Error { constructor(code, message) { super(message); this.code = code; } }
const stateMachine = require('../../satya_criterion_assessment_state_machine.json');

class InternalMonitoringAssessmentService {
  async assessCriterion(actor, targetId, criterionId, payload) {
    const { status, review_note, score } = payload;
    
    // 1. Validate status
    if (!stateMachine.criterion_statuses.includes(status)) {
      throw new InternalMonitoringError('INVALID_STATUS', `Status ${status} is not allowed`);
    }

    // 2. Validate state machine rules
    const rules = stateMachine.criterion_rules[status];
    if (rules.review_note_required && !review_note) {
      throw new InternalMonitoringError('MISSING_REVIEW_NOTE', `Review note is required for status ${status}`);
    }
    if (rules.reason_required && !review_note) {
      throw new InternalMonitoringError('MISSING_REASON', `Reason is required for status ${status}`);
    }
    // Note: authority validation for NOT_APPLICABLE would check if actor has ADMIN_PT or PIMPINAN role,
    // assuming here it's enforced in authorization layer or controller.

    return knex.transaction(async trx => {
      // Validate criterion belongs to target
      const criterion = await trx('monitoring_target_criteria')
        .where({ id: criterionId, monitoring_target_id: targetId })
        .first();
      
      if (!criterion) {
        throw new InternalMonitoringError('NOT_FOUND', 'Criterion not found for target');
      }

      // Check for existing assessment
      const existing = await trx('monitoring_criterion_assessments')
        .where('target_criterion_id', criterionId)
        .first();

      const assessmentPayload = {
        target_criterion_id: criterionId,
        status,
        score: score !== undefined ? score : stateMachine.score_values[status],
        review_note,
        reviewer_user_id: actor.id,
        assessment_cycle_no: existing ? existing.assessment_cycle_no : 1, // If we track cycles
        created_at: new Date()
      };

      let assessmentId;
      if (existing) {
        await trx('monitoring_criterion_assessments')
          .where('id', existing.id)
          .update(assessmentPayload);
        assessmentId = existing.id;
      } else {
        const [inserted] = await trx('monitoring_criterion_assessments')
          .insert(assessmentPayload)
          .returning('id');
        assessmentId = inserted.id || inserted;
      }

      return { id: assessmentId, ...assessmentPayload };
    });
  }
}

module.exports = new InternalMonitoringAssessmentService();
