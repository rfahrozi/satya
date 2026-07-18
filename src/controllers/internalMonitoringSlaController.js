const slaService = require('../services/internalMonitoringSlaService');
const knex = require('../config/knex');

exports.getDashboardSla = async (req, res, next) => {
  try {
    const data = await slaService.getDashboardSla();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAging = async (req, res, next) => {
  try {
    const data = await knex('monitoring_sla_snapshots')
      .orderBy('captured_at', 'desc')
      .limit(100);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getEscalationsDashboard = async (req, res, next) => {
  try {
    const data = await knex('monitoring_escalations')
      .select('level')
      .count('id as count')
      .whereIn('status', ['OPEN', 'ACKNOWLEDGED'])
      .groupBy('level');
      
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
