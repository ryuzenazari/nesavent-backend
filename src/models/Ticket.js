const mongoose = require('mongoose');
const ticketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketType: {
    type: String,
    enum: ['regular', 'student', 'custom'],
    required: true
  },
  ticketTypeId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ticketTypeName: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  qrCode: {
    dataUrl: String,
    verificationCode: String
  },
  isEmailSent: {
    type: Boolean,
    default: false
  },
  checkInTime: {
    type: Date
  },
  checkInInfo: {
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scannedAt: Date,
    scanLocation: String
  },
  ticketBenefits: [{
    type: String
  }],
  transferHistory: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    transferredAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });
ticketSchema.pre('save', function(next) {
  if (!this.ticketNumber) {
    this.ticketNumber = `TIX-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-6)}`;
  }
  next();
});
const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket; 