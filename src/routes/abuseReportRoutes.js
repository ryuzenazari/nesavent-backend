const express = require('express');
const router = express.Router();
const abuseReportController = require('../controllers/abuseReportController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Rute yang dapat diakses oleh semua user yang terotentikasi
router.post('/', protect, abuseReportController.createReport);
router.get('/my-reports', protect, abuseReportController.getMyReports);
router.get('/:id', protect, abuseReportController.getReportById);

// Rute khusus admin
router.get('/', protect, restrictTo('admin'), abuseReportController.getAllReports);
router.patch('/:id/status', protect, restrictTo('admin'), abuseReportController.updateReportStatus);
router.post('/:id/related', protect, restrictTo('admin'), abuseReportController.addRelatedReport);
router.get('/stats/overview', protect, restrictTo('admin'), abuseReportController.getReportStats);

module.exports = router; 