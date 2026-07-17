const repo = require('../repositories/internalMonitoringRepo');
const knex = require('../config/knex');

class InternalMonitoringDashboardService {
  async getMySummary(periodId, actor) {
    if (!periodId) throw new Error('periodId required');
    return repo.getMySummary(actor.id, periodId, knex);
  }

  async getOperationalSummary(periodId, actor) {
    if (!periodId) throw new Error('periodId required');
    
    // Authorization check: Operational dashboard might be limited to Pimpinan, Admin, or Unit Heads.
    // For this slice, we allow access but might filter by role in a real app.
    
    const summary = await repo.getOperationalSummary(periodId, knex);
    
    // Ensure all statuses have at least 0
    const statuses = [
      'NOT_STARTED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 
      'AWAITING_VERIFICATION', 'REVISION_REQUIRED', 'VERIFIED', 
      'CANCELLED', 'NOT_APPLICABLE'
    ];
    
    const result = {};
    for (const st of statuses) {
      result[st] = summary[st] || 0;
    }
    
    return result;
  }
}

module.exports = new InternalMonitoringDashboardService();
