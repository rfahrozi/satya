const InternalMonitoringRiskService = require('../services/internalMonitoringRiskService');
const knex = require('../config/knex');

class InternalMonitoringRiskController {
  constructor() {
    this.riskService = new InternalMonitoringRiskService();
  }

  createFinding = async (req, res, next) => {
    try {
      const finding = await this.riskService.createFinding(req.body.target_id, req.user.id, req.body);
      res.status(201).json({ success: true, data: finding });
    } catch (err) {
      next(err);
    }
  };

  assessRisk = async (req, res, next) => {
    try {
      const risk = await this.riskService.assessRisk(req.params.id, req.body, req.user.id);
      res.status(201).json({ success: true, data: risk });
    } catch (err) {
      next(err);
    }
  };

  closeFinding = async (req, res, next) => {
    try {
      const finding = await this.riskService.closeFinding(req.params.id, req.body, req.user.id);
      res.json({ success: true, data: finding });
    } catch (err) {
      next(err);
    }
  };

  getFindings = async (req, res, next) => {
    try {
      const findings = await knex('monitoring_findings').orderBy('created_at', 'desc');
      res.json({ success: true, data: findings });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new InternalMonitoringRiskController();
