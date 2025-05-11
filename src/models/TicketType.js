const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    availableQuantity: {
      type: Number,
      required: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    benefits: [
      {
        type: String
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    earlyBirdPrice: {
      type: Number
    },
    earlyBirdEndDate: {
      type: Date
    },
    isEarlyBirdActive: {
      type: Boolean,
      default: false
    },
    sold: {
      type: Number,
      default: 0
    }
  },
  { 
    timestamps: true 
  }
);

const TicketType = mongoose.model('TicketType', ticketTypeSchema);

module.exports = TicketType; 