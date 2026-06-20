const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const tenantContext = require('../middlewares/tenant');

// Semua rute membutuhkan login dan tenantContext
router.use(tenantContext);

// Satkers
router.get('/satkers', masterController.getSatkers);
router.post('/satkers', masterController.createSatker);
router.put('/satkers/:id', masterController.updateSatker);
router.delete('/satkers/:id', masterController.deleteSatker);

// Report Types
router.get('/report-types', masterController.getReportTypes);
router.post('/report-types', masterController.createReportType);
router.put('/report-types/:id', masterController.updateReportType);
router.delete('/report-types/:id', masterController.deleteReportType);

// Deadlines
router.get('/deadlines', masterController.getDeadlines);
router.post('/deadlines', masterController.createDeadline);
router.put('/deadlines/:id', masterController.updateDeadline);
router.delete('/deadlines/:id', masterController.deleteDeadline);

module.exports = router;
