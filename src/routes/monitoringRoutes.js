const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleAccess');

router.get('/health', monitoringController.healthCheck);
router.get('/metrics', authenticate, adminOnly, monitoringController.getMetrics);
router.get('/errors', authenticate, adminOnly, monitoringController.getErrors);
router.get('/performance', authenticate, adminOnly, monitoringController.getPerformanceMetrics);
router.get('/logs', authenticate, adminOnly, monitoringController.getLogs);
router.get('/system', authenticate, adminOnly, monitoringController.getSystemInfo);

module.exports = router; 