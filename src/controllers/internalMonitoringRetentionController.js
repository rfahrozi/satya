const InternalMonitoringRetentionService = require('../services/internalMonitoringRetentionService');
const knex = require('../config/knex');

class InternalMonitoringRetentionController {
  constructor() {
    this.retentionService = new InternalMonitoringRetentionService();
  }

  getLegalHolds = async (req, res, next) => {
    try {
      const holds = await knex('monitoring_legal_holds').orderBy('created_at', 'desc');
      res.json({ success: true, data: holds });
    } catch (err) {
      next(err);
    }
  };

  createLegalHold = async (req, res, next) => {
    try {
      const { scopeType, scopeId, reason, referenceNumber } = req.body;
      const hold = await this.retentionService.placeLegalHold(scopeType, scopeId, reason, req.user.id, referenceNumber);
      res.status(201).json({ success: true, data: hold });
    } catch (err) {
      next(err);
    }
  };

  releaseLegalHold = async (req, res, next) => {
    try {
      const hold = await this.retentionService.releaseLegalHold(req.params.id);
      res.json({ success: true, data: hold });
    } catch (err) {
      next(err);
    }
  };
  
  getRetentionPolicies = async (req, res, next) => {
    try {
      const policies = await knex('monitoring_retention_policies').orderBy('created_at', 'desc');
      res.json({ success: true, data: policies });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new InternalMonitoringRetentionController();
