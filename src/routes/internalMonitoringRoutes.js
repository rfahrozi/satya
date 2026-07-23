const express = require('express');
const multer = require('multer');
const os = require('os');
const path = require('path');
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
// --- Global Authentication Middleware untuk Internal Monitoring ---
router.use(authenticate);

router.use((req, res, next) => {
  req.user = req.tenant || {};
  req.user.id = req.user.userId;
  next();
});

// [SRE-01] Ganti memoryStorage dengan diskStorage untuk menghindari OOM Crash
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Limit upload evidence internal monitoring maksimal 15x per menit
const imUploadLimiter = process.env.NODE_ENV !== 'test'
    ? rateLimit({
        windowMs: 60 * 1000,
        max: 15,
        message: { success: false, message: 'Terlalu banyak permintaan unggah evidence. Tunggu 1 menit.' }
    })
    : (req, res, next) => next();

// --- Period, Generation & Master Items ---
// [SEC-B01] Tambahkan authorize() ke endpoint management periode agar hanya admin
// Pengecualian: GET /periods boleh diakses siapapun yang sudah login agar bisa mengisi dropdown portal.
router.get('/periods', masterController.listPeriods);
router.post('/periods', authorize(['ADMIN_PT']), masterController.createPeriod);
router.post('/periods/:id/open', authorize(['ADMIN_PT']), masterController.openPeriod);
router.post('/periods/:id/generate-preview', authorize(['ADMIN_PT']), masterController.generatePreview);
router.post('/periods/:id/generate', authorize(['ADMIN_PT']), masterController.generateTargets);
router.get('/master-items', authorize(['ADMIN_PT']), masterController.listMasterItems);

// --- Dashboard ---
router.get('/dashboard/my', authenticate, dashboardController.getMyDashboard);
router.get('/dashboard/operational', authorize(['ADMIN_PT', 'PIMPINAN_PT', 'PANITERA_PT', 'SEKRETARIS_PT', 'VERIFIER']), dashboardController.getOperationalDashboard);
router.get('/dashboard/executive', authorize(['ADMIN_PT', 'PIMPINAN_PT', 'KPT', 'WKPT', 'HAKIM_PT', 'PIMPINAN']), dashboardController.getExecutiveDashboard);
router.get('/review-queue', authorize(['ADMIN_PT', 'VERIFIER']), dashboardController.listReviewQueue);
router.get('/follow-up-queue', dashboardController.listFollowUpQueue);

// --- Target (Operational) ---
// [SEC-B03] Mencegah general access ke seluruh target di-handle di level controller/service
// sehingga request dari Frontend (yang menambahkan query params) tidak terpotong HTTP 403.
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
router.post('/targets/batch-verify', authorize(['VERIFIER', 'ADMIN_PT']), operationalController.batchVerifyTargets);
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
router.post('/master-imports/preview', authorize(['ADMIN_PT']), upload.single('file'), masterImportController.previewImport);
router.post('/master-imports/:id/commit', authorize(['ADMIN_PT']), masterImportController.commitImport);
router.get('/master-imports/:id/coverage', authorize(['ADMIN_PT']), masterImportController.getCoverageReport);

// --- Reminder Rules ---
router.get('/reminder-rules', authorize(['ADMIN_PT']), reminderController.listRules);
router.post('/reminder-rules', authorize(['ADMIN_PT']), reminderController.createRule);
router.patch('/reminder-rules/:id', authorize(['ADMIN_PT']), reminderController.updateRule);
router.post('/reminder-rules/:id/test', authorize(['ADMIN_PT']), reminderController.testRule);

// --- Escalation ---
// [SEC-B02] Pencegahan Mass-Assignment ada di layer Controller/Service. Kita lindungi rutenya.
router.get('/escalation-rules', authorize(['ADMIN_PT']), escalationController.listRules);
router.post('/escalation-rules', authorize(['ADMIN_PT']), escalationController.createRule);
router.patch('/escalation-rules/:id', authorize(['ADMIN_PT']), escalationController.updateRule);
router.get('/escalations', authorize(['ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER']), escalationController.listEscalations);
router.post('/escalations/:id/acknowledge', escalationController.acknowledgeEscalation);
router.post('/escalations/:id/resolve', escalationController.resolveEscalation);

// --- SLA & Aging ---
router.get('/dashboard/sla', authorize(['ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER']), slaController.getDashboardSla);
router.get('/dashboard/aging', authorize(['ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER']), slaController.getAging);
router.get('/dashboard/escalations', authorize(['ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER']), slaController.getEscalationsDashboard);
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
// Gunakan endpoint yang berbeda (prefix: /engine) untuk master engine controller
// agar tidak menimpa route master-imports dari legacy controller di atas
router.post('/engine/master-imports/preview', authorize(['ADMIN_PT']), upload.single('file'), masterEngineController.previewImport);
router.post('/engine/master-imports/commit', authorize(['ADMIN_PT']), masterEngineController.commitImport);
router.post('/engine/master-versions/:id/activate', authorize(['ADMIN_PT']), masterEngineController.activateVersion);
router.get('/engine/master-versions/:id/coverage', authorize(['ADMIN_PT']), masterEngineController.getCoverage);
router.post('/engine/master-targets/preview', authorize(['ADMIN_PT']), masterEngineController.generateTargetsPreview);
router.post('/engine/master-targets/generate', authorize(['ADMIN_PT']), masterEngineController.generateTargets);
router.post('/engine/events', authorize(['ADMIN_PT']), masterEngineController.createEvent);
router.post('/engine/events/:id/generate-targets', authorize(['ADMIN_PT']), masterEngineController.generateEventTargets);

module.exports = router;
