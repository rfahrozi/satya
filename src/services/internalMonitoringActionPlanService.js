const knex = require('../config/knex');
const ActionPlanStateMachine = require('../domain/internalMonitoring/actionPlanStateMachine');

class InternalMonitoringActionPlanService {

  async createActionPlan(riskId, actionData, actorId) {
    const trx = await knex.transaction();
    try {
      const plan = {
        action_code: `CAP-${Date.now()}`,
        risk_id: riskId,
        title: actionData.title,
        description: actionData.description,
        action_type: actionData.action_type,
        owner_user_id: actionData.owner_user_id,
        approver_user_id: actionData.approver_user_id || null,
        start_at: actionData.start_at,
        due_at: actionData.due_at,
        priority: actionData.priority || 'MEDIUM',
        expected_outcome: actionData.expected_outcome,
        created_by: actorId,
        status: 'DRAFT'
      };

      const [newPlan] = await trx('monitoring_action_plans').insert(plan).returning('*');

      if (riskId) {
        await trx('monitoring_risk_links').insert({
          risk_id: riskId,
          action_plan_id: newPlan.id,
          relationship_type: 'MITIGATED_BY'
        });
      }

      await trx.commit();
      return newPlan;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async submitEffectivenessReview(planId, reviewData, actorId) {
    const trx = await knex.transaction();
    try {
      const plan = await trx('monitoring_action_plans').where('id', planId).forUpdate().first();
      if (!plan) throw new Error('Action plan not found');

      // The plan should be in AWAITING_EFFECTIVENESS_REVIEW
      // Transition based on result (EFFECTIVE or INEFFECTIVE)
      const action = reviewData.result === 'EFFECTIVE' ? 'MARK_EFFECTIVE' : 'MARK_INEFFECTIVE';
      const newState = ActionPlanStateMachine.transition(plan.status, action);

      const [review] = await trx('monitoring_effectiveness_reviews').insert({
        action_plan_id: planId,
        reviewer_user_id: actorId,
        review_method: reviewData.method,
        review_note: reviewData.note,
        result: reviewData.result,
        residual_risk_before: reviewData.residual_risk_before,
        residual_risk_after: reviewData.residual_risk_after,
        reviewed_evidence_json: JSON.stringify(reviewData.evidence || [])
      }).returning('*');

      await trx('monitoring_action_plans')
        .where('id', planId)
        .update({ status: newState, updated_at: new Date() });

      await trx.commit();
      return review;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }
}

module.exports = InternalMonitoringActionPlanService;
