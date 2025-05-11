const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');

// Definisikan model StudentVerification di dalam file ini
const studentVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  method: {
    type: String,
    enum: ['email', 'ktm'],
    required: true
  },
  ktmUrl: {
    type: String
  },
  email: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  nim: {
    type: String
  },
  faculty: {
    type: String
  },
  major: {
    type: String
  },
  history: [
    {
      status: String,
      changedAt: Date,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      note: String
    }
  ],
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  rejectedAt: Date,
  note: String
}, {
  timestamps: true
});

const StudentVerification = mongoose.model('StudentVerification', studentVerificationSchema);

async function requestVerification({ userId, method, ktmUrl, email, nim, faculty, major }) {
  const existing = await StudentVerification.findOne({ user: userId });
  if (existing && existing.status === 'pending') {
    throw new Error('Pengajuan verifikasi masih dalam proses');
  }
  const verification = new StudentVerification({
    user: userId,
    method,
    ktmUrl: method === 'ktm' ? ktmUrl : undefined,
    email: method === 'email' ? email : undefined,
    nim,
    faculty,
    major,
    status: 'pending',
    history: [
      {
        status: 'pending',
        changedAt: new Date(),
        changedBy: userId
      }
    ],
    requestedAt: new Date()
  });
  await verification.save();
  return verification;
}

async function approveVerification(verificationId, adminId, note) {
  const verification = await StudentVerification.findById(verificationId);
  if (!verification) throw new Error('Data verifikasi tidak ditemukan');
  if (verification.status === 'approved') throw new Error('Sudah disetujui');
  verification.status = 'approved';
  verification.approvedAt = new Date();
  verification.note = note;
  verification.history.push({
    status: 'approved',
    changedAt: new Date(),
    changedBy: adminId,
    note
  });
  await verification.save();
  await User.findByIdAndUpdate(verification.user, { role: 'student' });
  return verification;
}

async function rejectVerification(verificationId, adminId, note) {
  const verification = await StudentVerification.findById(verificationId);
  if (!verification) throw new Error('Data verifikasi tidak ditemukan');
  if (verification.status === 'rejected') throw new Error('Sudah ditolak');
  verification.status = 'rejected';
  verification.rejectedAt = new Date();
  verification.note = note;
  verification.history.push({
    status: 'rejected',
    changedAt: new Date(),
    changedBy: adminId,
    note
  });
  await verification.save();
  return verification;
}

async function getPendingVerifications() {
  return StudentVerification.find({ status: 'pending' })
    .populate('user', 'name email')
    .sort({ requestedAt: 1 });
}

async function getAllVerifications() {
  return StudentVerification.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
}

async function getVerificationById(id) {
  return StudentVerification.findById(id)
    .populate('user', 'name email');
}

async function getUserVerification(userId) {
  return StudentVerification.findOne({ user: userId });
}

async function getVerificationHistory(userId) {
  const verification = await StudentVerification.findOne({ user: userId });
  return verification ? verification.history : [];
}

module.exports = {
  requestVerification,
  approveVerification,
  rejectVerification,
  getPendingVerifications,
  getAllVerifications,
  getVerificationById,
  getUserVerification,
  getVerificationHistory
}; 