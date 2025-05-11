const studentVerificationService = require('../services/studentVerificationService');
const { ktmUpload } = require('../utils/uploadConfig');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function requestVerification(req, res) {
  try {
    const { method, email } = req.body;
    const userId = req.user.id;
    
    if (method === 'ktm' && !req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'File KTM harus diunggah untuk verifikasi dengan metode KTM' 
      });
    }
    
    const ktmUrl = method === 'ktm' && req.file ? `/uploads/documents/ktm/${req.file.filename}` : null;
    
    const verification = await studentVerificationService.requestVerification({ 
      userId, 
      method, 
      ktmUrl, 
      email 
    });
    
    res.status(201).json({ success: true, data: verification });
  } catch (error) {
    if (req.file) {
      const filePath = path.join(__dirname, '../../', req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function approveVerification(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { note } = req.body;
    const verification = await studentVerificationService.approveVerification(id, adminId, note);
    res.status(200).json({ success: true, data: verification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function rejectVerification(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { note } = req.body;
    const verification = await studentVerificationService.rejectVerification(id, adminId, note);
    res.status(200).json({ success: true, data: verification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getPendingVerifications(req, res) {
  try {
    const list = await studentVerificationService.getPendingVerifications();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getAllVerifications(req, res) {
  try {
    const verifications = await studentVerificationService.getAllVerifications();
    res.status(200).json({ success: true, data: verifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getVerificationById(req, res) {
  try {
    const { id } = req.params;
    const verification = await studentVerificationService.getVerificationById(id);
    
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verifikasi tidak ditemukan' });
    }
    
    res.status(200).json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getUserVerification(req, res) {
  try {
    const userId = req.user.id;
    const verification = await studentVerificationService.getUserVerification(userId);
    res.status(200).json({ success: true, data: verification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getVerificationHistory(req, res) {
  try {
    const userId = req.user.id;
    const history = await studentVerificationService.getVerificationHistory(userId);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

const uploadKTM = ktmUpload.single('ktm');

/**
 * @desc    Mendapatkan status verifikasi mahasiswa
 * @route   GET /api/student-verification/status
 * @access  Private
 */
const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const verification = await studentVerificationService.getUserVerification(userId);
    
    if (!verification) {
      return res.status(200).json({
        success: true,
        isVerified: false,
        status: 'not_submitted',
        message: 'Belum ada pengajuan verifikasi'
      });
    }
    
    res.status(200).json({
      success: true,
      isVerified: verification.isVerified,
      status: verification.status,
      updatedAt: verification.updatedAt,
      message: getStatusMessage(verification.status)
    });
  } catch (error) {
    logger.error('Error saat mengambil status verifikasi', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil status verifikasi',
      error: error.message
    });
  }
};

/**
 * @desc    Submit verifikasi mahasiswa baru
 * @route   POST /api/student-verification/submit
 * @access  Private
 */
const submitVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nim, faculty, major } = req.body;
    
    if (!nim || !faculty || !major) {
      return res.status(400).json({
        success: false,
        message: 'NIM, Fakultas, dan Jurusan wajib diisi'
      });
    }
    
    // Cek apakah sudah ada pengajuan sebelumnya
    const existingVerification = await studentVerificationService.getUserVerification(userId);
    
    if (existingVerification) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah pernah mengajukan verifikasi',
        status: existingVerification.status
      });
    }
    
    // Buat verifikasi baru melalui service
    const verification = await studentVerificationService.requestVerification({
      userId,
      method: 'email',
      nim,
      faculty,
      major
    });
    
    res.status(201).json({
      success: true,
      message: 'Pengajuan verifikasi berhasil dikirim, menunggu persetujuan admin',
      verification
    });
  } catch (error) {
    logger.error('Error saat membuat pengajuan verifikasi', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Gagal membuat pengajuan verifikasi',
      error: error.message
    });
  }
};

// Helper function untuk mendapatkan pesan status
const getStatusMessage = (status) => {
  const statusMessages = {
    'pending': 'Pengajuan verifikasi sedang diproses',
    'approved': 'Verifikasi mahasiswa telah disetujui',
    'rejected': 'Pengajuan verifikasi ditolak',
    'not_submitted': 'Belum ada pengajuan verifikasi'
  };
  
  return statusMessages[status] || 'Status tidak diketahui';
};

module.exports = {
  requestVerification,
  approveVerification,
  rejectVerification,
  getPendingVerifications,
  getAllVerifications,
  getVerificationById,
  getUserVerification,
  getVerificationHistory,
  uploadKTM,
  getVerificationStatus,
  submitVerification
}; 