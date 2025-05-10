const mongoose = require('mongoose');

const dataRetentionPolicySchema = new mongoose.Schema(
  {
    dataType: {
      type: String,
      required: true,
      enum: ['user', 'event', 'ticket', 'transaction', 'log', 'verification', 'feedback', 'rating', 'report', 'backup', 'other'],
      unique: true
    },
    retentionPeriod: {
      value: {
        type: Number,
        required: true,
        min: 1
      },
      unit: {
        type: String,
        required: true,
        enum: ['days', 'weeks', 'months', 'years']
      }
    },
    anonymizationRules: {
      type: Map,
      of: {
        action: {
          type: String,
          enum: ['delete', 'anonymize', 'pseudonymize', 'encrypt', 'none']
        },
        fields: [String]
      }
    },
    archivePolicy: {
      enabled: {
        type: Boolean,
        default: false
      },
      storageLocation: {
        type: String,
        enum: ['local', 's3', 'gcs', 'azure', 'other'],
        default: 'local'
      },
      archivePeriod: {
        value: {
          type: Number
        },
        unit: {
          type: String,
          enum: ['days', 'weeks', 'months', 'years']
        }
      }
    },
    exceptions: {
      legalHold: {
        type: Boolean,
        default: false
      },
      userRequest: {
        type: Boolean,
        default: false
      },
      disputeResolution: {
        type: Boolean,
        default: false
      }
    },
    lastExecuted: {
      type: Date
    },
    nextScheduled: {
      type: Date
    },
    enabled: {
      type: Boolean,
      default: true
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

dataRetentionPolicySchema.index({ dataType: 1 });
dataRetentionPolicySchema.index({ enabled: 1 });
dataRetentionPolicySchema.index({ nextScheduled: 1 });

const DataRetentionPolicy = mongoose.model('DataRetentionPolicy', dataRetentionPolicySchema);

module.exports = DataRetentionPolicy; 