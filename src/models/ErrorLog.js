const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    index: true
  },
  stack: {
    type: String
  },
  code: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    path: {
      type: String,
      index: true
    },
    method: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    ip: String,
    userAgent: String,
    source: String
  }
}, {
  timestamps: true
});

errorLogSchema.index({ 'metadata.path': 1, 'timestamp': -1 });
errorLogSchema.index({ message: 'text' });

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);

module.exports = ErrorLog; 