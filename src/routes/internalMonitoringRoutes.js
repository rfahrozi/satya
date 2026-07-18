const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const masterController = require('../controllers/internalMonitoringMasterController');
const operationalController = require('../controllers/internalMonitoringController');
const dashboardController = require('../controllers/internalMonitoringDashboardController');
const masterImportController = require('../controllers/internalMonitoringMasterImportController');
const reminderController = require('../controllers/internalMonitoringReminderController');
const escalationController = require('../controllers/internalMonitoringEscalationController');
const slaController = require('../controllers/internalMonitoringSlaController');
const internalMonitoringRetentionController = require('../controllers/internalMonitoringRetentionController');
const internalMonitoringRiskController = require('../controllers/internalMonitoringRiskController');
const internalMonitoringActionController = require('../controllers/internalMonitoringActionController');
const internalMonitoringManagementReviewController = require('../controllers/internalMonitoringManagementReviewController');
const internalMonitoringRiskGovernanceController = require('../controllers/internalMonitoringRiskGovernanceController');
const internalMonitoringReportController = require('../controllers/internalMonitoringReportController');
const masterEngineController = require('../controllers/internalMonitoringMasterEngineController');
const matrixController = require('../controllers/internalMonitoringMatrixController');
const tenantContext = require('../middlewares/tenant');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();
router.use(tenantContext);
router.use((req, res, next) => {
  req.user = req.tenant || {};
  req.user.id = req.user.userId;
  next();
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Limit upload evidence internal monitoring maksimal 15x per menit
const imUploadLimiter = process.env.NODE_ENV !== 'test'
    ? rateLimit({
        windowMs: 60 * 1000,
        max: 15,
        message: { success: false, message: 'Terlalu banyak permintaan unggah evidence. Tunggu 1 menit.' }
    })
    : (req, res, next) => next();

// --- Period, Generation & Master Items ---
router.get('/periods', masterController.listPeriods);
router.post('/periods', masterController.createPeriod);
router.post('/periods/:id/open', masterController.openPeriod);
router.post('/periods/:id/generate-preview', masterController.generatePreview);
router.post('/periods/:id/generate', masterController.generateTargets);
router.get('/master-items', authorize(['ADMIN_PT']), masterController.listMasterItems);

// --- Dashboard ---
router.get('/dashboard/my', dashboardController.getMyDashboard);
router.get('/dashboard/operational', dashboardController.getOperationalDashboard);
router.get('/dashboard/executive', dashboardController.getExecutiveDashboard);
router.get('/review-queue', dashboardController.listReviewQueue);
router.get('/follow-up-queue', dashboardController.listFollowUpQueue);

// --- Target (Operational) ---
router.get('/targets', operationalController.listTargets);
router.get('/my-targets', operationalController.listMyTargets);
router.get('/targets/:id', operationalController.getTargetDetail);
router.patch('/targets/:id/draft', operationalController.saveDraft);
router.post('/targets/:id/submit', operationalController.submitTarget);
router.post('/targets/:id/approve', operationalController.approveTarget);
router.post('/targets/:id/request-revision', operationalController.requestRevision);
// NOTE: /targets/:id/reject explicitly disabled for vertical slice 01

// --- Assessment Matrix ---
router.get('/targets/:targetId/coverage', matrixController.getCoverage);
router.get('/targets/:targetId/criteria', matrixController.getCriteria);
router.patch('/targets/:targetId/criteria/:criterionId/assessment', authorize(['VERIFIER', 'ADMIN_PT']), matrixController.assessCriterion);
router.post('/targets/:targetId/criteria/:criterionId/evidence-links', authorize(['SATKER_PN', 'VERIFIER', 'ADMIN_PT']), matrixController.linkEvidence);
router.post('/targets/:targetId/criteria/:criterionId/parameter-links', authorize(['SATKER_PN', 'VERIFIER', 'ADMIN_PT']), matrixController.linkParameter);
router.post('/targets/:targetId/verify', authorize(['VERIFIER', 'ADMIN_PT']), matrixController.verifyTarget);
router.post('/criterion-assessments/:criterionAssessmentId/findings', authorize(['VERIFIER', 'ADMIN_PT']), matrixController.createFinding);

// --- Evidence ---
router.get('/targets/:id/evidence', operationalController.listEvidence);
router.post('/targets/:id/evidence', operationalController.addEvidence);
router.post('/targets/:id/evidence/:requirementId/file', imUploadLimiter, upload.single('file'), operationalController.addEvidenceFile);
router.get('/targets/:id/evidence/:evidenceId/download', operationalController.getEvidenceDownloadUrl);

// --- Follow-ups ---
router.get('/targets/:id/follow-ups', operationalController.listFollowUps);
router.post('/targets/:id/follow-ups', operationalController.createFollowUp);
router.post('/follow-ups/:id/start', operationalController.startFollowUp);
router.post('/follow-ups/:id/submit-resolution', operationalController.submitFollowUpResolution);
router.post('/follow-ups/:id/close', operationalController.closeFollowUp);
router.post('/follow-ups/:id/reopen', operationalController.reopenFollowUp);

// --- Master Import ---
router.post('/master-imports/preview', upload.single('file'), masterImportController.previewImport);
router.post('/master-imports/:id/commit', masterImportController.commitImport);
router.get('/master-imports/:id/coverage', masterImportController.getCoverageReport);

// --- Reminder Rules ---
router.get('/reminder-rules', reminderController.listRules);
router.post('/reminder-rules', reminderController.createRule);
router.patch('/reminder-rules/:id', reminderController.updateRule);
router.post('/reminder-rules/:id/test', reminderController.testRule);

// --- Escalation ---
router.get('/escalation-rules', escalationController.listRules);
router.post('/escalation-rules', escalationController.createRule);
router.patch('/escalation-rules/:id', escalationController.updateRule);
router.get('/escalations', escalationController.listEscalations);
router.post('/escalations/:id/acknowledge', escalationController.acknowledgeEscalation);
router.post('/escalations/:id/resolve', escalationController.resolveEscalation);

// --- SLA & Aging ---
router.get('/dashboard/sla', slaController.getDashboardSla);
router.get('/dashboard/aging', slaController.getAging);
router.get('/dashboard/escalations', slaController.getEscalationsDashboard);
// Reports
router.post('/report-runs', authorize(['ADMIN_PT', 'PIMPINAN', 'VERIFIER', 'SATKER_PN']), internalMonitoringReportController.createReportRun);
router.get('/report-runs', authorize(['ADMIN_PT', 'PIMPINAN', 'VERIFIER', 'SATKER_PN']), internalMonitoringReportController.getReportRuns);
router.get('/report-runs/:id', authorize(['ADMIN_PT', 'PIMPINAN', 'VERIFIER', 'SATKER_PN']), internalMonitoringReportController.getReportRunDetail);
router.get('/report-runs/:id/files/:fileId/download', authorize(['ADMIN_PT', 'PIMPINAN', 'VERIFIER', 'SATKER_PN']), internalMonitoringReportController.downloadReportFile);

// Retention & Legal Holds
router.get('/retention-policies', authorize(['ADMIN_PT']), internalMonitoringRetentionController.getRetentionPolicies);
router.get('/legal-holds', authorize(['ADMIN_PT']), internalMonitoringRetentionController.getLegalHolds);
router.post('/legal-holds', authorize(['ADMIN_PT']), internalMonitoringRetentionController.createLegalHold);
// Findings & Risks
router.post('/findings', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringRiskController.createFinding);
router.post('/findings/:id/assess', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringRiskController.assessRisk);
router.post('/findings/:id/close', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringRiskController.closeFinding);
router.get('/findings', authorize(['VERIFIER', 'ADMIN_PT', 'PIMPINAN', 'SATKER_PN']), internalMonitoringRiskController.getFindings);

// Action Plans
router.post('/action-plans', authorize(['VERIFIER', 'ADMIN_PT', 'SATKER_PN']), internalMonitoringActionController.createActionPlan);
router.post('/action-plans/:id/review-effectiveness', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringActionController.submitEffectivenessReview);
router.get('/action-plans', authorize(['VERIFIER', 'ADMIN_PT', 'PIMPINAN', 'SATKER_PN']), internalMonitoringActionController.getActionPlans);

// Management Reviews
router.post('/management-reviews', authorize(['ADMIN_PT']), internalMonitoringManagementReviewController.createReview);
router.post('/management-reviews/:id/items', authorize(['ADMIN_PT']), internalMonitoringManagementReviewController.addItem);
router.post('/management-reviews/:id/build-pack', authorize(['ADMIN_PT']), internalMonitoringManagementReviewController.buildPack);
router.patch('/management-reviews/:id/items/:itemId', authorize(['ADMIN_PT']), internalMonitoringManagementReviewController.updateItemDecision);
router.post('/management-reviews/:id/submit', authorize(['ADMIN_PT']), internalMonitoringManagementReviewController.submitReview);
router.post('/management-reviews/:id/finalize', authorize(['ADMIN_PT', 'PIMPINAN']), internalMonitoringManagementReviewController.finalizeReview);
router.post('/management-reviews/:id/amend', authorize(['ADMIN_PT', 'PIMPINAN']), internalMonitoringManagementReviewController.amendReview);
router.get('/management-reviews', authorize(['ADMIN_PT', 'PIMPINAN']), internalMonitoringManagementReviewController.getReviews);

// Risk Governance
router.get('/dashboard/risk-heatmap', internalMonitoringRiskGovernanceController.getRiskHeatmap);
router.get('/dashboard/risk-trends', internalMonitoringRiskGovernanceController.getRiskTrends);
router.get('/dashboard/repeat-findings', internalMonitoringRiskGovernanceController.getRepeatFindingQueue);
router.get('/dashboard/action-aging', internalMonitoringRiskGovernanceController.getRepeatFindingQueue);
router.get('/dashboard/risk-acceptances', internalMonitoringRiskGovernanceController.getRiskAcceptances);

// Risk Acceptances
router.get('/risk-acceptances', internalMonitoringRiskGovernanceController.getRiskAcceptances);
router.post('/risks/:id/accept', authorize(['PIMPINAN', 'ADMIN_PT', 'UNIT_HEAD']), internalMonitoringRiskGovernanceController.acceptRisk);
router.post('/risk-acceptances/:id/revoke', authorize(['PIMPINAN', 'ADMIN_PT']), internalMonitoringRiskGovernanceController.revokeRiskAcceptance);

// Repeat Findings
router.get('/repeat-finding-candidates', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringRiskGovernanceController.getRepeatFindingQueue);
router.post('/repeat-finding-candidates/detect', authorize(['ADMIN_PT']), internalMonitoringRiskGovernanceController.detectRepeatFindings);
router.post('/repeat-finding-candidates/:id/confirm', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringRiskGovernanceController.confirmRepeatFinding);
router.post('/repeat-finding-candidates/:id/reject', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringRiskGovernanceController.rejectRepeatFinding);
router.post('/repeat-finding-candidates/:id/merge', authorize(['VERIFIER', 'ADMIN_PT']), internalMonitoringRiskGovernanceController.mergeRepeatFinding);
// --- Master Engine Routes ---
router.post('/master-imports/preview', masterEngineController.previewImport);
router.post('/master-imports/commit', masterEngineController.commitImport);
router.post('/master-versions/:id/activate', masterEngineController.activateVersion);
router.get('/master-versions/:id/coverage', masterEngineController.getCoverage);
router.post('/master-targets/preview', masterEngineController.generateTargetsPreview);
router.post('/master-targets/generate', masterEngineController.generateTargets);
router.post('/events', masterEngineController.createEvent);
router.post('/events/:id/generate-targets', masterEngineController.generateEventTargets);

module.exports = router;
