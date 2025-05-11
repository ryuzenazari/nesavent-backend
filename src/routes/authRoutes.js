const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, checkRole, verifyAdmin } = require('../middleware/auth');
const { rateLimiters, generalLimiter } = require('../middleware/rateLimiter');
const { profileUpload, handleUploadError } = require('../utils/uploadConfig');
const passport = require('../config/passport');
const router = express.Router();
const isAdmin = checkRole('admin');
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Nama wajib diisi'),
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password')
      .isLength({
        min: 6
      })
      .withMessage('Password minimal 6 karakter')
      .matches(/\d/)
      .withMessage('Password harus mengandung angka')
  ],
  authController.register
);
router.post(
  '/login',
  rateLimiters.auth,
  [
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi')
  ],
  authController.login
);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Email tidak valid')],
  authController.forgotPassword
);
router.post(
  '/reset-password/:token',
  [
    body('password')
      .isLength({
        min: 6
      })
      .withMessage('Password minimal 6 karakter')
      .matches(/\d/)
      .withMessage('Password harus mengandung angka')
  ],
  authController.resetPassword
);
router.get('/profile', authenticate, authController.getProfile);
router.put(
  '/profile',
  authenticate,
  [body('name').optional().notEmpty().withMessage('Nama tidak boleh kosong')],
  authController.updateProfile
);
router.post(
  '/profile/image',
  authenticate,
  profileUpload.single('image'),
  handleUploadError,
  authController.uploadProfileImage
);
router.put(
  '/role',
  authenticate,
  isAdmin,
  [
    body('userId').notEmpty().withMessage('User ID wajib diisi'),
    body('role').notEmpty().withMessage('Role wajib diisi')
  ],
  authController.updateRole
);
router.get('/admin-check', authenticate, verifyAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin terverifikasi',
    admin: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    }
  });
});
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: false
  }),
  authController.googleCallback
);
router.get('/google/failure', authController.googleFailure);
module.exports = router;
