const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const LoginAttempt = require('../models/LoginAttempt');

const generateToken = userId => {
  return jwt.sign(
    {
      id: userId
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN
    }
  );
};
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({
      email
    });
    if (existingUser) {
      return res.status(409).json({
        message: 'Email sudah terdaftar'
      });
    }
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);
    let role = 'user';
    if (email.endsWith('@mhs.unesa.ac.id') || email.endsWith('@unesa.ac.id')) {
      role = 'student';
    }
    const user = new User({
      name,
      email,
      password,
      role,
      verificationToken,
      verificationTokenExpires
    });
    await user.save();
    
    try {
      // Kirim email verifikasi
      const emailResult = await emailService.sendVerificationEmail(email, user.name, verificationToken);
      
      // Cek hasil pengiriman email
      if (!emailResult || !emailResult.success) {
        // Email gagal terkirim - log error tetapi user tetap terdaftar
        logger.error(`Failed to send verification email: ${emailResult?.message || 'Unknown error'}`);
        
        return res.status(201).json({
          message: 'Pendaftaran berhasil, tetapi gagal mengirim email verifikasi. Silakan hubungi administrator.',
          userId: user._id
        });
      }
      
      // Sukses - email berhasil dikirim
      logger.info(`User registered: ${email}`);
      res.status(201).json({
        message: 'Pendaftaran berhasil. Silakan verifikasi email Anda.'
      });
    } catch (emailError) {
      // Handle error dalam pengiriman email
      logger.error(`Email sending error: ${emailError?.message || String(emailError)}`);
      return res.status(201).json({
        message: 'Pendaftaran berhasil, tetapi gagal mengirim email verifikasi. Silakan hubungi administrator.',
        userId: user._id
      });
    }
  } catch (error) {
    logger.error(`Registration error: ${error?.message || String(error)}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat mendaftar',
      error: error?.message || 'Unknown error'
    });
  }
};
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: {
        $gt: new Date()
      }
    });
    if (!user) {
      return res.status(400).json({
        message: 'Token verifikasi tidak valid atau telah kadaluarsa'
      });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    logger.info(`Email verified for user: ${user.email}`);
    res.status(200).json({
      message: 'Email berhasil diverifikasi. Silakan login.'
    });
  } catch (error) {
    logger.error(`Email verification error: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat verifikasi email'
    });
  }
};
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({
      email
    });
    if (!user) {
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }
    if (user.isVerified) {
      return res.status(400).json({
        message: 'Email sudah terverifikasi'
      });
    }
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();
    
    try {
      // Kirim email verifikasi
      const emailResult = await emailService.sendVerificationEmail(email, user.name, verificationToken);
      
      // Cek hasil pengiriman email
      if (!emailResult || !emailResult.success) {
        // Email gagal terkirim - log error
        logger.error(`Failed to send verification email: ${emailResult?.message || 'Unknown error'}`);
        return res.status(500).json({
          message: 'Gagal mengirim email verifikasi. Silakan coba lagi nanti.'
        });
      }
      
      logger.info(`Verification email resent to: ${email}`);
      res.status(200).json({
        message: 'Email verifikasi telah dikirim ulang'
      });
    } catch (emailError) {
      // Handle error dalam pengiriman email
      logger.error(`Email sending error: ${emailError?.message || String(emailError)}`);
      return res.status(500).json({
        message: 'Gagal mengirim email verifikasi. Silakan coba lagi nanti.'
      });
    }
  } catch (error) {
    logger.error(`Resend verification error: ${error?.message || String(error)}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat mengirim ulang email verifikasi',
      error: error?.message || 'Unknown error'
    });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const user = await User.findOne({
      email
    });
    if (!user) {
      return res.status(401).json({
        message: 'Email atau password salah'
      });
    }
    if (user.isAccountLocked()) {
      return res.status(403).json({
        message: 'Akun terkunci. Silakan coba lagi nanti',
        lockedUntil: user.lockedUntil
      });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      if (user.loginAttempts >= 5) {
        return res.status(403).json({
          message: 'Terlalu banyak percobaan login. Akun terkunci selama 30 menit',
          lockedUntil: user.lockedUntil
        });
      }
      return res.status(401).json({
        message: 'Email atau password salah',
        attempts: user.loginAttempts,
        maxAttempts: 5
      });
    }
    
    // PENGUJIAN: Nonaktifkan verifikasi email untuk pengujian
    // if (!user.isVerified) {
    //   return res.status(403).json({
    //     message: 'Email belum diverifikasi. Silakan verifikasi email Anda'
    //   });
    // }
    
    if (user.role === 'admin') {
      logger.info(`Admin logged in: ${email}`);
    } else if (user.role === 'staff_creator') {
      logger.info(`Staff Creator logged in: ${email}`);
    } else if (user.role === 'creator') {
      logger.info(`Creator logged in: ${email}`);
    } else {
      logger.info(`User logged in: ${email}`);
    }
    await user.resetLoginAttempts();
    const token = generateToken(user._id);
    let responseData = {
      message: 'Login berhasil',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      }
    };
    if (user.role === 'staff_creator' && user.staffDetails) {
      let creatorInfo = null;
      if (user.staffDetails.addedBy) {
        try {
          const creator = await User.findById(user.staffDetails.addedBy).select('name email');
          if (creator) {
            creatorInfo = {
              id: creator._id,
              name: creator.name,
              email: creator.email
            };
          }
        } catch (error) {
          logger.error(`Error getting creator info: ${error.message}`);
        }
      }
      responseData.user.staffDetails = {
        staffName: user.staffDetails.staffName || user.name,
        creatorInfo,
        message: 'Staff creator hanya dapat melakukan scan QR code tiket'
      };
      responseData.redirectTo = '/staff/dashboard';
    }
    res.status(200).json(responseData);
  } catch (error) {
    logger.error(`Login error: ${error ? error.message : 'Unknown error occurred'}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat login'
    });
  }
};
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      '-password -verificationToken -verificationTokenExpires'
    );
    if (!user) {
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }
    res.status(200).json({
      user
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat mengambil profil'
    });
  }
};
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }
    if (name) user.name = name;
    await user.save();
    logger.info(`Profile updated for user: ${user.email}`);
    res.status(200).json({
      message: 'Profil berhasil diperbarui',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat memperbarui profil'
    });
  }
};
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Tidak ada file yang diunggah'
      });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '../../', user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();
    logger.info(`Profile image uploaded for user: ${user.email}`);
    res.status(200).json({
      message: 'Foto profil berhasil diunggah',
      profileImage: user.profileImage
    });
  } catch (error) {
    logger.error(`Upload profile image error: ${error.message}`);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      message: 'Terjadi kesalahan saat mengunggah foto profil'
    });
  }
};
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        message: 'User dengan email tersebut tidak ditemukan'
      });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();
    
    try {
      // Kirim email reset password
      logger.info(`Attempting to send password reset email to: ${email}`);
      const emailResult = await emailService.sendPasswordResetEmail(email, user.name, resetToken);
      
      if (emailResult.success) {
        logger.info(`Password reset email sent to: ${email}`);
        res.status(200).json({
          message: 'Link reset password telah dikirim ke email Anda'
        });
      } else {
        logger.error(`Failed to send password reset email: ${emailResult.message}`);
        res.status(200).json({
          message: 'Link reset password telah dibuat, tetapi gagal mengirim email. Silakan hubungi administrator.'
        });
      }
    } catch (emailError) {
      logger.error(`Error sending password reset email: ${emailError.message}`);
      res.status(200).json({
        message: 'Link reset password telah dibuat, tetapi gagal mengirim email. Silakan hubungi administrator.'
      });
    }
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat memproses permintaan reset password'
    });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: 'Token reset password tidak valid atau telah kadaluarsa'
      });
    }
    
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    logger.info(`Password reset successful for: ${user.email}`);
    
    res.status(200).json({
      message: 'Password berhasil diperbarui. Silakan login dengan password baru.'
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat reset password'
    });
  }
};
const updateRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!['user', 'student', 'creator', 'staff_creator', 'admin'].includes(role)) {
      return res.status(400).json({
        message: 'Role tidak valid'
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }
    user.role = role;
    await user.save();
    logger.info(`User role updated: ${user.email} -> ${role} by admin: ${req.userId}`);
    res.status(200).json({
      message: 'Role user berhasil diperbarui',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Update role error: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat memperbarui role'
    });
  }
};
const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=failed_google_login`);
    }
    const token = jwt.sign(
      {
        userId: req.user._id,
        role: req.user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/google/callback?token=${token}&userId=${req.user._id}`
    );
  } catch (error) {
    logger.error('Google callback error:', {
      error: error.message
    });
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=internal_server_error`);
  }
};
const googleFailure = (req, res) => {
  logger.error('Google authentication failed');
  return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  getProfile,
  updateProfile,
  uploadProfileImage,
  forgotPassword,
  resetPassword,
  updateRole,
  googleCallback,
  googleFailure
};
