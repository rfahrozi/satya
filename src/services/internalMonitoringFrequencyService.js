const knex = require('../config/knex');

class InternalMonitoringFrequencyService {
  constructor() {
    this.strategies = [
      require('../domain/internalMonitoring/frequency/monthlyStrategy'),
      require('../domain/internalMonitoring/frequency/quarterlyStrategy'),
      require('../domain/internalMonitoring/frequency/semiannualStrategy'),
      require('../domain/internalMonitoring/frequency/annualRegulatorStrategy'),
      require('../domain/internalMonitoring/frequency/annualChangeStrategy'),
      require('../domain/internalMonitoring/frequency/continuousReviewStrategy'),
      require('../domain/internalMonitoring/frequency/eventRecapStrategy')
    ];
  }

  getStrategy(frequencyType) {
    const strategy = this.strategies.find(s => s.supports(frequencyType));
    if (!strategy) {
      throw new Error(`Unsupported frequency type: ${frequencyType}`);
    }
    return strategy;
  }

  async previewTargets(periodId, itemCodes, actorId) {
    const items = await knex('monitoring_items').whereIn('item_code', itemCodes);
    const period = await knex('monitoring_periods').where('id', periodId).first();
    const previews = [];

    for (const item of items) {
      const strategy = this.getStrategy(item.frequency_type);
      const generated = await strategy.preview({ item, period, actorId });
      previews.push(...generated);
    }
    return previews;
  }

  async generateTargets(periodId, itemCodes, actorId) {
    const items = await knex('monitoring_items').whereIn('item_code', itemCodes);
    const period = await knex('monitoring_periods').where('id', periodId).first();
    const generatedIds = [];

    await knex.transaction(async trx => {
      for (const item of items) {
        const strategy = this.getStrategy(item.frequency_type);
        const targets = await strategy.generate({ item, period, actorId, trx });
        generatedIds.push(...targets.map(t => t.id || t));
      }
    });

    return generatedIds;
  }

  async generateEventTargets(eventId, actorId) {
    const event = await knex('monitoring_events').where('id', eventId).first();
    const items = await knex('monitoring_items').whereIn('frequency_type', ['EVENT_WITH_MONTHLY_RECAP', 'ANNUAL_WITH_CHANGE_EVENTS']);
    
    // In a real implementation we would map specific items to event types,
    // For now we'll just ask strategies to evaluate if they should fire.
    const generatedIds = [];
    
    await knex.transaction(async trx => {
      for (const item of items) {
        const strategy = this.getStrategy(item.frequency_type);
        if (strategy.generateEventTargets) {
          const targets = await strategy.generateEventTargets({ event, item, actorId, trx });
          generatedIds.push(...targets.map(t => t.id || t));
        }
      }
    });

    return generatedIds;
  }
}

module.exports = new InternalMonitoringFrequencyService();
