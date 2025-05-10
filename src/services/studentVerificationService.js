const StudentVerification = require('../models/StudentVerification');
const User = require('../models/User');

async function requestVerification({ userId, method, ktmUrl, email }) {
  const existing = await StudentVerification.findOne({ user: userId });
  if (existing && existing.status === 'pending') {
    throw new Error('Pengajuan verifikasi masih dalam proses');
  }
  const verification = new StudentVerification({
    user: userId,
    method,
    ktmUrl: method === 'ktm' ? ktmUrl : undefined,
    email: method === 'email' ? email : undefined,
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
  getUserVerification,
  getVerificationHistory
}; 