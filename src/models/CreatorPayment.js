const mongoose = require('mongoose');

const creatorPaymentSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['bank_transfer', 'e_wallet']
    },
    bankAccount: {
      bankName: String,
      accountNumber: String,
      accountHolder: String
    },
    eWallet: {
      provider: String,
      accountNumber: String,
      accountHolder: String
    },
    paymentProof: {
      type: String
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: {
      type: Date
    },
    notes: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

creatorPaymentSchema.index({
  creator: 1
});

creatorPaymentSchema.index({
  event: 1
});

creatorPaymentSchema.index({
  status: 1
});

creatorPaymentSchema.index({
  createdAt: 1
});

creatorPaymentSchema.statics.getPendingPayments = async function (creatorId) {
  return this.aggregate([
    {
      $match: {
        creator: mongoose.Types.ObjectId(creatorId),
        status: 'pending'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: {
          $sum: '$amount'
        },
        count: {
          $sum: 1
        }
      }
    }
  ]);
};

creatorPaymentSchema.statics.getCreatorPaymentHistory = async function (
  creatorId,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  const payments = await this.find({
    creator: creatorId
  })
    .sort({
      createdAt: -1
    })
    .skip(skip)
    .limit(limit)
    .populate('event', 'title startDate')
    .populate('processedBy', 'name email');

  const total = await this.countDocuments({
    creator: creatorId
  });

  return {
    payments,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

const CreatorPayment = mongoose.model('CreatorPayment', creatorPaymentSchema);

module.exports = CreatorPayment;
