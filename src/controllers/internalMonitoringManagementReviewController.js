const InternalMonitoringManagementReviewService = require('../services/internalMonitoringManagementReviewService');
const knex = require('../config/knex');

class InternalMonitoringManagementReviewController {
  constructor() {
    this.reviewService = new InternalMonitoringManagementReviewService();
  }

  createReview = async (req, res, next) => {
    try {
      const review = await this.reviewService.createReview(req.body, req.user.id);
      res.status(201).json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  };

  addItem = async (req, res, next) => {
    try {
      const item = await this.reviewService.addItem(req.params.id, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };

  finalizeReview = async (req, res, next) => {
    try {
      const finalized = await this.reviewService.finalizeReview(req.params.id, req.user.id, req.user.role, req.body.lock_version);
      res.json({ success: true, data: finalized });
    } catch (err) {
      next(err);
    }
  };

  buildPack = async (req, res, next) => {
    try {
      const result = await this.reviewService.buildReviewPack(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  updateItemDecision = async (req, res, next) => {
    try {
      const updated = await this.reviewService.updateReviewItemDecision(req.params.id, req.params.itemId, req.body, req.user.id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  submitReview = async (req, res, next) => {
    try {
      const submitted = await this.reviewService.submitReview(req.params.id, req.user.id, req.body.lock_version);
      res.json({ success: true, data: submitted });
    } catch (err) {
      next(err);
    }
  };

  amendReview = async (req, res, next) => {
    try {
      const amended = await this.reviewService.amendReview(req.params.id, req.body.reason, req.user.id);
      res.json({ success: true, data: amended });
    } catch (err) {
      next(err);
    }
  };

  getReviews = async (req, res, next) => {
    try {
      const reviews = await knex('monitoring_management_reviews').orderBy('created_at', 'desc');
      res.json({ success: true, data: reviews });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new InternalMonitoringManagementReviewController();
