const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'view', 'login', 'logout', 'export', 'import', 'approve', 'reject', 'other']
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['user', 'event', 'ticket', 'transaction', 'shortlink', 'verification', 'system', 'config', 'report', 'other']
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    details: {
      type: Object,
      default: {}
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    metadata: {
      browser: String,
      os: String,
      device: String,
      location: String
    },
    statusCode: {
      type: Number
    },
    result: {
      type: String,
      enum: ['success', 'failure', 'error', 'warning', 'info']
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      default: 'info'
    },
    retentionDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ result: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ retentionDate: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog; 