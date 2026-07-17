const express = require('express');
const multer = require('multer');
const masterController = require('../controllers/internalMonitoringMasterController');
const operationalController = require('../controllers/internalMonitoringController');
const dashboardController = require('../controllers/internalMonitoringDashboardController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// --- Period & Generation ---
router.get('/periods', masterController.listPeriods);
router.post('/periods', masterController.createPeriod);
router.post('/periods/:id/open', masterController.openPeriod);
router.post('/periods/:id/generate-preview', masterController.generatePreview);
router.post('/periods/:id/generate', masterController.generateTargets);

// --- Dashboard ---
router.get('/dashboard/my', dashboardController.getMyDashboard);
router.get('/dashboard/operational', dashboardController.getOperationalDashboard);

// --- Target (Operational) ---
router.get('/targets', operationalController.listTargets);
router.get('/my-targets', operationalController.listMyTargets);
router.get('/targets/:id', operationalController.getTargetDetail);
router.patch('/targets/:id/draft', operationalController.saveDraft);
router.post('/targets/:id/submit', operationalController.submitTarget);
router.post('/targets/:id/approve', operationalController.approveTarget);
router.post('/targets/:id/request-revision', operationalController.requestRevision);
router.post('/targets/:id/verify', operationalController.verifyTarget);
// NOTE: /targets/:id/reject explicitly disabled for vertical slice 01

// --- Evidence ---
router.get('/targets/:id/evidence', operationalController.listEvidence);
router.post('/targets/:id/evidence', operationalController.addEvidence);
router.post('/targets/:id/evidence/:requirementId/file', upload.single('file'), operationalController.addEvidenceFile);

// --- Follow-ups ---
router.get('/targets/:id/follow-ups', operationalController.listFollowUps);
router.post('/targets/:id/follow-ups', operationalController.createFollowUp);
router.post('/follow-ups/:id/start', operationalController.startFollowUp);
router.post('/follow-ups/:id/submit-resolution', operationalController.submitFollowUpResolution);
router.post('/follow-ups/:id/close', operationalController.closeFollowUp);
router.post('/follow-ups/:id/reopen', operationalController.reopenFollowUp);

module.exports = router;
