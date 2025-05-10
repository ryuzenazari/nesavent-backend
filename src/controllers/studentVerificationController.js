const studentVerificationService = require('../services/studentVerificationService');
const { ktmUpload } = require('../utils/uploadConfig');
const fs = require('fs');
const path = require('path');

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

module.exports = {
  requestVerification,
  approveVerification,
  rejectVerification,
  getPendingVerifications,
  getUserVerification,
  getVerificationHistory,
  uploadKTM
}; 