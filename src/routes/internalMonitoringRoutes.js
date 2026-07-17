const express = require('express');
const multer = require('multer');
const masterController = require('../controllers/internalMonitoringMasterController');
const operationalController = require('../controllers/internalMonitoringController');
const dashboardController = require('../controllers/internalMonitoringDashboardController');
const tenantContext = require('../middlewares/tenant');
const { AppError } = require('../middlewares/errorHandler');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(new AppError('Format file tidak didukung. Gunakan PDF, XLSX, XLS, DOC, atau DOCX.', 400), false);
    }
  }
});

function uploadMultiple(fields) {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        const statusCode = err.statusCode || 400;
        return next(new AppError(err.message, statusCode));
      }
      next();
    });
  };
}

function mapRoleScope(role) {
  if (role === 'ADMIN_PT') return 'ADMIN_PT';
  if (['KPT', 'WKPT', 'PANITERA_PT'].includes(role)) return 'PIMPINAN_PT';
  if (['SEKRETARIS', 'PANMUD', 'PANMUD_HUKUM_PT', 'KASUBBAG', 'KASUBBAG_PTIP', 'PRANATA_KOMPUTER', 'STAFF_PT', 'ADMIN_PT_INTERNAL'].includes(role)) return 'UNIT_PIC';
  if (['VERIFIER', 'TIM_VERIFIKATOR', 'HAKIM_PENGAWAS'].includes(role)) return 'VERIFIER';
  return null;
}

const authorize = (...allowedRoles) => (req, res, next) => {
  const role = req.user?.role_scope;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
    });
  }
  next();
};

router.use(tenantContext);
router.use((req, res, next) => {
  req.user = {
    id: req.tenant?.userId || req.tenant?.id || null,
    role_scope: mapRoleScope(req.tenant?.role),
    role: req.tenant?.role,
    satker_id: req.tenant?.satkerId || null,
  };
  next();
});

router.use((req, res, next) => {
  if (!req.user?.role_scope) {
    return next(new AppError('Akses modul monitoring internal PT ditolak.', 403));
  }
  next();
});

// Master data
router.get('/units', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.listUnits);
router.post('/units', authorize('ADMIN_PT'), masterController.createUnit);
router.get('/units/:id', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.getUnitById);
router.patch('/units/:id', authorize('ADMIN_PT'), masterController.updateUnit);
router.delete('/units/:id', authorize('ADMIN_PT'), masterController.deleteUnit);

router.get('/positions', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.listPositions);
router.post('/positions', authorize('ADMIN_PT'), masterController.createPosition);
router.get('/positions/:id', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.getPositionById);
router.patch('/positions/:id', authorize('ADMIN_PT'), masterController.updatePosition);
router.delete('/positions/:id', authorize('ADMIN_PT'), masterController.deletePosition);

router.get('/assignments', authorize('ADMIN_PT', 'PIMPINAN_PT'), masterController.listAssignments);
router.post('/assignments', authorize('ADMIN_PT'), masterController.createAssignment);
router.patch('/assignments/:id', authorize('ADMIN_PT'), masterController.updateAssignment);
router.delete('/assignments/:id', authorize('ADMIN_PT'), masterController.deleteAssignment);

router.get('/packages', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.listPackages);
router.post('/packages', authorize('ADMIN_PT'), masterController.createPackage);
router.get('/packages/:id', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.getPackageById);
router.patch('/packages/:id', authorize('ADMIN_PT'), masterController.updatePackage);
router.delete('/packages/:id', authorize('ADMIN_PT'), masterController.deletePackage);

router.get('/items', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.listItems);
router.post('/items', authorize('ADMIN_PT'), masterController.createItem);
router.get('/items/:id', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.getItemById);
router.patch('/items/:id', authorize('ADMIN_PT'), masterController.updateItem);
router.delete('/items/:id', authorize('ADMIN_PT'), masterController.deleteItem);

router.get('/item-assignments', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), masterController.listItemAssignments);
router.post('/item-assignments', authorize('ADMIN_PT'), masterController.createItemAssignment);
router.patch('/item-assignments/:id', authorize('ADMIN_PT'), masterController.updateItemAssignment);
router.delete('/item-assignments/:id', authorize('ADMIN_PT'), masterController.deleteItemAssignment);

// Periods
router.get('/periods', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), operationalController.listPeriods);
router.post('/periods', authorize('ADMIN_PT'), operationalController.createPeriod);
router.get('/periods/:id', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VIEWER'), operationalController.getPeriodById);
router.patch('/periods/:id', authorize('ADMIN_PT'), operationalController.updatePeriod);
router.post('/periods/:id/open', authorize('ADMIN_PT'), operationalController.openPeriod);
router.post('/periods/:id/close', authorize('ADMIN_PT'), operationalController.closePeriod);
router.post('/periods/:id/generate-preview', authorize('ADMIN_PT'), operationalController.generatePreview);
router.post('/periods/:id/generate', authorize('ADMIN_PT'), operationalController.generateTargets);

// Targets
router.get('/targets', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER', 'VIEWER'), operationalController.listTargets);
router.get('/my-targets', authorize('UNIT_PIC', 'ADMIN_PT'), operationalController.listMyTargets);
router.get('/targets/:id', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER', 'UNIT_PIC', 'VIEWER'), operationalController.getTargetById);
router.patch('/targets/:id/assignment', authorize('ADMIN_PT'), operationalController.reassignTarget);
router.post('/targets/refresh-status', authorize('ADMIN_PT'), operationalController.refreshStatuses);
router.patch('/targets/:id/draft', authorize('UNIT_PIC', 'ADMIN_PT'), operationalController.saveDraft);
router.get('/targets/:id/submissions', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER', 'UNIT_PIC'), operationalController.getSubmissions);
router.get('/targets/:id/download', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER', 'UNIT_PIC'), operationalController.downloadLatest);
router.post('/targets/:id/upload', authorize('UNIT_PIC', 'ADMIN_PT'), uploadMultiple([{ name: 'dokumen_monev', maxCount: 1 }, { name: 'dokumen_excel', maxCount: 1 }]), operationalController.uploadTargetDocument);
router.post('/targets/:id/reupload', authorize('UNIT_PIC', 'ADMIN_PT'), uploadMultiple([{ name: 'dokumen_monev', maxCount: 1 }, { name: 'dokumen_excel', maxCount: 1 }]), operationalController.reuploadTargetDocument);
router.post('/targets/:id/verify', authorize('ADMIN_PT', 'VERIFIER', 'PIMPINAN_PT'), operationalController.verifyTarget);
router.post('/targets/:id/request-revision', authorize('ADMIN_PT', 'VERIFIER', 'PIMPINAN_PT'), operationalController.requestRevision);
router.post('/targets/:id/reject', authorize('ADMIN_PT', 'VERIFIER', 'PIMPINAN_PT'), operationalController.rejectSubmission);
router.get('/targets/:id/verification-history', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER', 'UNIT_PIC'), operationalController.getVerificationHistory);
router.get('/targets/:id/activity-log', authorize('ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER', 'UNIT_PIC'), operationalController.getActivityLog);
router.get('/activity-log', authorize('ADMIN_PT', 'PIMPINAN_PT'), operationalController.getGlobalActivityLog);

// Dashboards
router.get('/dashboard/executive', authorize('ADMIN_PT', 'PIMPINAN_PT'), dashboardController.getExecutiveDashboard);
router.get('/dashboard/operational', authorize('ADMIN_PT', 'VERIFIER', 'PIMPINAN_PT'), dashboardController.getOperationalDashboard);
router.get('/dashboard/my', authorize('UNIT_PIC', 'ADMIN_PT'), dashboardController.getMyDashboard);
router.get('/dashboard/compliance-heatmap', authorize('ADMIN_PT', 'PIMPINAN_PT'), dashboardController.getComplianceHeatmap);
router.get('/dashboard/trends', authorize('ADMIN_PT', 'PIMPINAN_PT'), dashboardController.getTrendDashboard);

module.exports = router;
