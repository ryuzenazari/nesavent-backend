const mongoose = require('mongoose');
const creatorVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true
  },
  organizationType: {
    type: String,
    enum: ['himpunan', 'ukm', 'fakultas', 'departemen', 'komunitas', 'lainnya'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  documents: [{
    type: String,
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  adminNotes: {
    type: String
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, { timestamps: true });
const CreatorVerification = mongoose.model('CreatorVerification', creatorVerificationSchema);
module.exports = CreatorVerification; 