const InternalMonitoringActionPlanService = require('../services/internalMonitoringActionPlanService');
const knex = require('../config/knex');

class InternalMonitoringActionController {
  constructor() {
    this.actionService = new InternalMonitoringActionPlanService();
  }

  createActionPlan = async (req, res, next) => {
    try {
      const plan = await this.actionService.createActionPlan(req.body.risk_id, req.body, req.user.id);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  };

  submitEffectivenessReview = async (req, res, next) => {
    try {
      const review = await this.actionService.submitEffectivenessReview(req.params.id, req.body, req.user.id);
      res.status(201).json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  };

  getActionPlans = async (req, res, next) => {
    try {
      const plans = await knex('monitoring_action_plans').orderBy('created_at', 'desc');
      res.json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new InternalMonitoringActionController();
