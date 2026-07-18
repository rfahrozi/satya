const repo = require('../repositories/internalMonitoring/dashboardRepo');
const knex = require('../config/knex');
const redis = require('../config/redis');

/**
 * Ambil periode aktif jika periodId tidak disediakan.
 * Ini memungkinkan dashboard dipanggil tanpa hardcode period ID.
 */
async function resolveActivePeriodId(periodId) {
  if (periodId) return parseInt(periodId, 10);
  const active = await knex('monitoring_periods').where({ status: 'ACTIVE' }).orderBy('created_at', 'desc').first();
  return active?.id ?? null;
}

class InternalMonitoringDashboardService {
  async getMyDashboard(periodId, actor) {
    const resolved = await resolveActivePeriodId(periodId);
    if (!resolved) return { summary: { total: 0, notStarted: 0, inProgress: 0, awaitingApproval: 0, verified: 0, overdue: 0, openFollowUps: 0 } };
    return repo.getMyDashboard(actor.id, resolved, {}, knex);
  }

  async getOperationalDashboard(periodId, actor) {
    const resolved = await resolveActivePeriodId(periodId);
    if (!resolved) return { summary: {} };
    return repo.getOperationalDashboard(resolved, {}, knex);
  }

  async getExecutiveDashboard(periodId, actor) {
    const resolved = await resolveActivePeriodId(periodId);
    if (!resolved) return { complianceRate: 0, verifiedOnTimeRate: 0, overdueCount: 0, openFollowUpCount: 0, byUnit: [], criticalItems: [] };

    // [SRE-02] Redis Cache untuk Executive Dashboard
    const cacheKey = `dashboard:executive:period:${resolved}`;

    // Di environment test, redis connection kadang belum siap di-mock dengan sempurna.
    // Kita pastikan ada fallback logic
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // Abaikan error redis (fallback ke db)
    }

    const result = await repo.getExecutiveDashboard(resolved, {}, knex);

    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 menit
    } catch (e) {}

    return result;
  }

  async listReviewQueue(periodId, pagination, actor) {
    const resolved = await resolveActivePeriodId(periodId);
    return repo.listReviewQueue(actor, { period_id: resolved }, pagination, knex);
  }

  async listFollowUpQueue(periodId, pagination, actor) {
    const resolved = await resolveActivePeriodId(periodId);
    return repo.listFollowUpQueue(actor, { period_id: resolved }, pagination, knex);
  }
}

module.exports = new InternalMonitoringDashboardService();
