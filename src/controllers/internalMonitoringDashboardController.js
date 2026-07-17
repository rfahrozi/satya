const dashboardService = require('../services/internalMonitoringDashboardService');

exports.getMyDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getMySummary(req.query.period_id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getOperationalDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getOperationalSummary(req.query.period_id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
