const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const tenantContext = require('../middlewares/tenant');

// Semua rute membutuhkan login dan tenantContext
router.use(tenantContext);

// Endpoint notifikasi
router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
