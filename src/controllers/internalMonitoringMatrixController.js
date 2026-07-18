const coverageService = require('../services/internalMonitoringCoverageService');
const assessmentService = require('../services/internalMonitoringAssessmentService');
const verificationService = require('../services/internalMonitoringVerificationService');
const criterionService = require('../services/internalMonitoringCriterionService');

exports.getCoverage = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const coverage = await coverageService.getSubmissionReadiness(targetId);
    res.json(coverage);
  } catch (err) {
    next(err);
  }
};

exports.getCriteria = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const knex = require('../config/knex');
    const criteria = await knex('monitoring_target_criteria')
      .leftJoin('monitoring_criterion_assessments', 'monitoring_target_criteria.id', 'monitoring_criterion_assessments.target_criterion_id')
      .where('monitoring_target_criteria.monitoring_target_id', targetId)
      .select(
        'monitoring_target_criteria.*',
        'monitoring_criterion_assessments.status',
        'monitoring_criterion_assessments.score',
        'monitoring_criterion_assessments.review_note'
      );
    res.json(criteria);
  } catch (err) {
    next(err);
  }
};

exports.assessCriterion = async (req, res, next) => {
  try {
    const { targetId, criterionId } = req.params;
    const assessment = await assessmentService.assessCriterion(req.user, targetId, criterionId, req.body);
    res.json(assessment);
  } catch (err) {
    next(err);
  }
};

exports.linkEvidence = async (req, res, next) => {
  try {
    const { targetId, criterionId } = req.params;
    const { evidenceId, evidenceVersion, linkType } = req.body;
    const link = await criterionService.linkEvidence(req.user, targetId, criterionId, evidenceId, evidenceVersion, linkType);
    res.status(201).json(link);
  } catch (err) {
    next(err);
  }
};

exports.linkParameter = async (req, res, next) => {
  try {
    const { targetId, criterionId } = req.params;
    const { targetParameterValueId, parameterVersionNo } = req.body;
    const link = await criterionService.linkParameter(req.user, targetId, criterionId, targetParameterValueId, parameterVersionNo);
    res.status(201).json(link);
  } catch (err) {
    next(err);
  }
};

exports.verifyTarget = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const result = await verificationService.verifyTarget(req.user, targetId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.createFinding = async (req, res, next) => {
  try {
    const { criterionAssessmentId } = req.params;
    const finding = await verificationService.createFindingFromCriterion(req.user, criterionAssessmentId, req.body);
    res.status(201).json(finding);
  } catch (err) {
    next(err);
  }
};
