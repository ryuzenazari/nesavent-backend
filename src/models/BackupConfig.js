const mongoose = require('mongoose');

const backupConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String
    },
    enabled: {
      type: Boolean,
      default: true
    },
    scheduleType: {
      type: String,
      enum: ['manual', 'scheduled', 'realtime'],
      default: 'scheduled'
    },
    schedule: {
      frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly', 'custom']
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31
      },
      time: {
        hour: {
          type: Number,
          min: 0,
          max: 23
        },
        minute: {
          type: Number,
          min: 0,
          max: 59
        }
      },
      cronExpression: {
        type: String
      }
    },
    dataScope: {
      type: [String],
      enum: ['all', 'users', 'events', 'tickets', 'transactions', 'logs', 'configs', 'media', 'custom'],
      default: ['all']
    },
    customScope: {
      collections: [String],
      excludeCollections: [String],
      includeMediaFiles: {
        type: Boolean,
        default: true
      },
      includeConfigFiles: {
        type: Boolean,
        default: true
      }
    },
    backupLocation: {
      type: {
        type: String,
        enum: ['local', 's3', 'gcs', 'azure', 'ftp', 'custom'],
        default: 'local'
      },
      path: {
        type: String,
        default: 'backups/'
      },
      credentials: {
        accessKey: String,
        secretKey: String,
        accountName: String,
        containerName: String,
        region: String,
        endpoint: String,
        bucketName: String
      }
    },
    retention: {
      keepLastN: {
        type: Number,
        default: 5
      },
      maxAgeInDays: {
        type: Number,
        default: 30
      }
    },
    encryption: {
      enabled: {
        type: Boolean,
        default: false
      },
      algorithm: {
        type: String,
        enum: ['aes-256-cbc', 'aes-256-gcm', 'custom'],
        default: 'aes-256-cbc'
      },
      keyManagement: {
        type: String,
        enum: ['local', 'kms', 'vault', 'custom'],
        default: 'local'
      }
    },
    compression: {
      enabled: {
        type: Boolean,
        default: true
      },
      algorithm: {
        type: String,
        enum: ['gzip', 'zip', 'tar', 'custom'],
        default: 'gzip'
      },
      level: {
        type: Number,
        min: 1,
        max: 9,
        default: 6
      }
    },
    notifications: {
      onSuccess: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          type: [String],
          enum: ['email', 'slack', 'webhook', 'sms', 'custom'],
          default: ['email']
        },
        recipients: [String]
      },
      onFailure: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          type: [String],
          enum: ['email', 'slack', 'webhook', 'sms', 'custom'],
          default: ['email']
        },
        recipients: [String]
      }
    },
    lastBackup: {
      timestamp: Date,
      status: {
        type: String,
        enum: ['success', 'failed', 'partial', 'in_progress', 'not_started']
      },
      size: Number,
      location: String,
      message: String
    },
    nextBackup: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

backupConfigSchema.index({ name: 1 });
backupConfigSchema.index({ enabled: 1 });
backupConfigSchema.index({ 'scheduleType': 1 });
backupConfigSchema.index({ 'nextBackup': 1 });

const BackupConfig = mongoose.model('BackupConfig', backupConfigSchema);

module.exports = BackupConfig; 