const mongoose = require('mongoose');

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

module.exports = mongoose.model('StudentVerification', studentVerificationSchema); 