const repo = require('../repositories/internalMonitoringRepo');
const knex = require('../config/knex');

class InternalMonitoringDashboardService {
  async getMyDashboard(periodId, actor) {
    if (!periodId) throw new Error('periodId required');
    return repo.getMyDashboard(actor.id, periodId, {}, knex);
  }

  async getOperationalDashboard(periodId, actor) {
    if (!periodId) throw new Error('periodId required');
    return repo.getOperationalDashboard(periodId, {}, knex);
  }

  async getExecutiveDashboard(periodId, actor) {
    if (!periodId) throw new Error('periodId required');
    return repo.getExecutiveDashboard(periodId, {}, knex);
  }

  async listReviewQueue(periodId, pagination, actor) {
    return repo.listReviewQueue(actor, { period_id: periodId }, pagination, knex);
  }

  async listFollowUpQueue(periodId, pagination, actor) {
    return repo.listFollowUpQueue(actor, { period_id: periodId }, pagination, knex);
  }
}

module.exports = new InternalMonitoringDashboardService();
