const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'expired', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'credit_card', 'e_wallet', 'retail', 'qris'],
      required: true
    },
    midtrans: {
      orderId: {
        type: String,
        required: true,
        unique: true
      },
      transactionId: String,
      transactionTime: Date,
      paymentType: String,
      grossAmount: Number,
      transactionStatus: String,
      fraudStatus: String,
      paymentCode: String,
      paymentLink: String,
      expiryTime: Date
    },
    refundData: {
      refundId: String,
      amount: Number,
      reason: String,
      date: Date,
      status: String
    }
  },
  {
    timestamps: true
  }
);

// Virtual untuk memeriksa apakah pembayaran sudah kedaluwarsa
paymentSchema.virtual('isExpired').get(function() {
  if (this.status === 'pending' && this.midtrans && this.midtrans.expiryTime) {
    return new Date() > new Date(this.midtrans.expiryTime);
  }
  return false;
});

// Middleware untuk memperbarui status menjadi 'expired' jika kedaluwarsa
paymentSchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 