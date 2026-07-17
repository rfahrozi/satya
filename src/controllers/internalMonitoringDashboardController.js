const dashboardService = require('../services/internalMonitoringDashboardService');

exports.getMyDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getMyDashboard(req.query.period_id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getOperationalDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getOperationalDashboard(req.query.period_id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getExecutiveDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getExecutiveDashboard(req.query.period_id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.listReviewQueue = async (req, res, next) => {
  try {
    const pagination = { limit: parseInt(req.query.limit) || 20, offset: parseInt(req.query.offset) || 0 };
    const data = await dashboardService.listReviewQueue(req.query.period_id, pagination, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.listFollowUpQueue = async (req, res, next) => {
  try {
    const pagination = { limit: parseInt(req.query.limit) || 20, offset: parseInt(req.query.offset) || 0 };
    const data = await dashboardService.listFollowUpQueue(req.query.period_id, pagination, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
