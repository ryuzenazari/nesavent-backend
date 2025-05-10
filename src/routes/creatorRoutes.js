const express = require('express');
const { body } = require('express-validator');
const { authenticate, verifyCreator } = require('../middleware/auth');
const creatorController = require('../controllers/creatorController');
const { documentUpload, handleUploadError } = require('../utils/uploadConfig');
const router = express.Router();
router.use(authenticate);
router.post(
  '/verification',
  documentUpload.array('documents', 5), 
  handleUploadError,
  [
    body('organizationName').notEmpty().withMessage('Nama organisasi wajib diisi'),
    body('organizationType').notEmpty().isIn(['himpunan', 'ukm', 'fakultas', 'departemen', 'komunitas', 'lainnya']).withMessage('Tipe organisasi tidak valid'),
    body('phoneNumber').notEmpty().withMessage('Nomor telepon wajib diisi'),
    body('description').notEmpty().withMessage('Deskripsi wajib diisi')
  ],
  creatorController.submitVerification
);
router.get('/verification/status', creatorController.getVerificationStatus);
router.post(
  '/staff',
  verifyCreator,
  [
    body('email').optional().isEmail().withMessage('Email tidak valid'),
    body('userId').optional().isMongoId().withMessage('User ID tidak valid'),
    body('staffName').optional().isString().withMessage('Nama staff harus berupa string')
  ],
  creatorController.addStaffCreator
);
module.exports = router; 