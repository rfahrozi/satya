const InternalMonitoringRiskService = require('../services/internalMonitoringRiskService');
const InternalMonitoringRepeatFindingService = require('../services/internalMonitoringRepeatFindingService');
const InternalMonitoringRiskDashboardService = require('../services/internalMonitoringRiskDashboardService');

class InternalMonitoringRiskGovernanceController {
  constructor() {
    this.riskService = new InternalMonitoringRiskService();
    this.repeatService = new InternalMonitoringRepeatFindingService();
    this.dashboardService = new InternalMonitoringRiskDashboardService();
  }

  // --- Risk Acceptance ---
  acceptRisk = async (req, res, next) => {
    try {
      const acceptance = await this.riskService.acceptRisk(req.params.id, req.body, req.user.id, req.user.role);
      res.status(201).json({ success: true, data: acceptance });
    } catch (err) {
      next(err);
    }
  };

  revokeRiskAcceptance = async (req, res, next) => {
    try {
      const revoked = await this.riskService.revokeRiskAcceptance(req.params.id, req.body, req.user.id);
      res.json({ success: true, data: revoked });
    } catch (err) {
      next(err);
    }
  };

  // --- Repeat Findings ---
  detectRepeatFindings = async (req, res, next) => {
    try {
      const result = await this.repeatService.detectCandidates();
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  confirmRepeatFinding = async (req, res, next) => {
    try {
      const confirmed = await this.repeatService.confirmCandidate(req.params.id, req.user.id);
      res.json({ success: true, data: confirmed });
    } catch (err) {
      next(err);
    }
  };

  rejectRepeatFinding = async (req, res, next) => {
    try {
      const rejected = await this.repeatService.rejectCandidate(req.params.id, req.body.review_note, req.user.id);
      res.json({ success: true, data: rejected });
    } catch (err) {
      next(err);
    }
  };

  mergeRepeatFinding = async (req, res, next) => {
    try {
      const merged = await this.repeatService.mergeCandidate(req.params.id, req.user.id);
      res.json({ success: true, data: merged });
    } catch (err) {
      next(err);
    }
  };

  // --- Dashboards & Reports ---
  getRiskHeatmap = async (req, res, next) => {
    try {
      const heatmap = await this.dashboardService.getRiskHeatmap(req.query);
      res.json({ success: true, data: heatmap });
    } catch (err) {
      next(err);
    }
  };

  getRiskTrends = async (req, res, next) => {
    try {
      const trends = await this.dashboardService.getRiskTrends(req.query);
      res.json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  };

  getRepeatFindingQueue = async (req, res, next) => {
    try {
      const queue = await this.dashboardService.getRepeatFindingsQueue();
      res.json({ success: true, data: queue });
    } catch (err) {
      next(err);
    }
  };

  getRiskAcceptances = async (req, res, next) => {
    try {
      const acceptances = await this.dashboardService.getRiskAcceptances();
      res.json({ success: true, data: acceptances });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new InternalMonitoringRiskGovernanceController();
