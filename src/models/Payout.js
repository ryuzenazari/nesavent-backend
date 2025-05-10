const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'IDR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'e-wallet', 'paypal', 'other'],
    required: true
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    branchCode: String,
    swiftCode: String
  },
  eWalletDetails: {
    provider: String,
    accountId: String,
    phoneNumber: String
  },
  paypalDetails: {
    email: String
  },
  otherPaymentDetails: {
    method: String,
    accountIdentifier: String,
    additionalInfo: String
  },
  payoutEventsPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  events: [{
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    eventTitle: String,
    ticketsSold: Number,
    revenue: Number,
    platformFee: Number,
    netAmount: Number
  }],
  platformFee: {
    percentage: Number,
    fixedAmount: Number,
    total: Number
  },
  transactionId: String,
  referenceNumber: String,
  notes: String,
  adminNotes: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  scheduledDate: Date,
  completedAt: Date,
  failureReason: String,
  retryCount: {
    type: Number,
    default: 0
  },
  receipt: {
    url: String,
    uploadedAt: Date
  }
}, {
  timestamps: true
});

payoutSchema.index({ creatorId: 1, status: 1 });
payoutSchema.index({ status: 1, scheduledDate: 1 });
payoutSchema.index({ 'payoutEventsPeriod.startDate': 1, 'payoutEventsPeriod.endDate': 1 });

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout; 