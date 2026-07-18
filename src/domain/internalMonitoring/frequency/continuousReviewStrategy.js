const deadlineService = require('../../../services/internalMonitoringDeadlineService');
const requirementService = require('../../../services/internalMonitoringRequirementService');

class ContinuousReviewStrategy {
  supports(frequencyType) {
    return frequencyType === 'CONTINUOUS_WITH_MONTHLY_REVIEW';
  }

  buildNaturalKey(context) {
    const { item, period, scopeKey } = context;
    const periodStr = `${period.year}-${String(period.month).padStart(2, '0')}`;
    return `PT_INTERNAL:${item.id}:CONTINUOUS_WITH_MONTHLY_REVIEW:${periodStr}:${scopeKey}`;
  }

  async preview(context) {
    const { item, period, actorId } = context;
    const config = JSON.parse(item.frequency_config_json || '{}');
    const dueAt = await deadlineService.calculateDueAt('CONTINUOUS_WITH_MONTHLY_REVIEW', config, period.id, item.id);
    return [{
      item_code: item.item_code,
      natural_key: this.buildNaturalKey({ item, period, scopeKey: 'ORG' }),
      due_at: dueAt
    }];
  }

  async generate(context) {
    const { item, period, actorId, trx } = context;
    const config = JSON.parse(item.frequency_config_json || '{}');
    const dueAt = await deadlineService.calculateDueAt('CONTINUOUS_WITH_MONTHLY_REVIEW', config, period.id, item.id, trx);
    
    const [targetId] = await trx('monitoring_targets').insert({
      monitoring_item_id: item.id,
      natural_key: this.buildNaturalKey({ item, period, scopeKey: 'ORG' }),
      period_id: period.id,
      internal_unit_id: 1, // Defaulting to unit 1 for generated ones
      due_date: dueAt,
      status: 'OPEN'
    }).returning('id');

    const id = targetId.id || targetId;
    await requirementService.instantiateRequirements(id, item.id, trx);

    return [{ id }];
  }
}

module.exports = new ContinuousReviewStrategy();
