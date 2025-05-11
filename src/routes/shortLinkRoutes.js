const express = require('express');
const { body } = require('express-validator');
const { authenticate, verifyAdmin } = require('../middleware/auth');
const {
  redirectShortLink,
  getShortLinkInfo,
  createNewShortLink,
  getUserShortLinks,
  updateShortLink,
  deleteShortLink,
  getShortLinkStats,
  getMyShortLinks
} = require('../controllers/shortLinkController');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const adminVerify = require('../middleware/adminMiddleware');

// Spesifik rute terlebih dahulu
router.get('/info/:code', getShortLinkInfo);
router.get('/my-links', authMiddleware.authenticateJWT, getMyShortLinks);
router.get('/admin/stats', adminVerify, getShortLinkStats);

// Rute parameter
router.get('/:code', redirectShortLink);

router.use(authenticate);
router.post(
  '/',
  [
    body('targetType')
      .isIn(['event', 'ticket', 'page', 'external'])
      .withMessage('Tipe target tidak valid'),
    body('targetId').optional().isMongoId().withMessage('ID target tidak valid'),
    body('customUrl').optional().isString().withMessage('URL kustom harus berupa string'),
    body('expiresAt').optional().isISO8601().withMessage('Format tanggal kadaluarsa tidak valid')
  ],
  createNewShortLink
);
router.get('/', getUserShortLinks);
router.put(
  '/:code',
  [
    body('isActive').optional().isBoolean().withMessage('Status aktif harus berupa boolean'),
    body('expiresAt').optional().isISO8601().withMessage('Format tanggal kadaluarsa tidak valid'),
    body('customUrl').optional().isString().withMessage('URL kustom harus berupa string')
  ],
  updateShortLink
);
router.delete('/:code', deleteShortLink);

module.exports = router;
