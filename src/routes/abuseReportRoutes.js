const express = require('express');
const router = express.Router();
const abuseReportController = require('../controllers/abuseReportController');
const { authenticateJWT, authorizeRole } = require('../middleware/authMiddleware');

// Rute yang dapat diakses oleh semua user yang terotentikasi
router.post('/', authenticateJWT, abuseReportController.createReport);
router.get('/my-reports', authenticateJWT, abuseReportController.getMyReports);
router.get('/:id', authenticateJWT, abuseReportController.getReportById);

// Rute khusus admin
router.get('/', authenticateJWT, authorizeRole(['admin']), abuseReportController.getAllReports);
router.patch('/:id/status', authenticateJWT, authorizeRole(['admin']), abuseReportController.updateReportStatus);
router.post('/:id/related', authenticateJWT, authorizeRole(['admin']), abuseReportController.addRelatedReport);
router.get('/stats/overview', authenticateJWT, authorizeRole(['admin']), abuseReportController.getReportStats);

module.exports = router; 