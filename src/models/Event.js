const mongoose = require('mongoose');
const ticketTypeSchema = new mongoose.Schema({
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
  benefits: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  banner: {
    type: String
  },
  organizer: {
    type: String,
    required: true
  },
  totalTickets: {
    type: Number,
    required: true
  },
  availableTickets: {
    type: Number,
    required: true
  },
  price: {
    regular: {
      type: Number,
      required: true
    },
    student: {
      type: Number,
      required: true
    }
  },
  ticketTypes: {
    type: [ticketTypeSchema],
    default: function() {
      return [
        {
          name: 'Regular',
          description: 'Tiket reguler',
          price: this.price?.regular || 0,
          quantity: Math.ceil(this.totalTickets / 2),
          availableQuantity: Math.ceil(this.availableTickets / 2),
          benefits: ['Akses ke semua sesi utama'],
          isActive: true
        },
        {
          name: 'Student',
          description: 'Tiket khusus untuk mahasiswa',
          price: this.price?.student || 0,
          quantity: Math.floor(this.totalTickets / 2),
          availableQuantity: Math.floor(this.availableTickets / 2),
          benefits: ['Akses ke semua sesi utama', 'Diskon khusus mahasiswa'],
          isActive: true
        }
      ];
    },
    validate: [
      {
        validator: function(ticketTypes) {
          return ticketTypes.length > 0;
        },
        message: 'Event harus memiliki minimal satu tipe tiket'
      }
    ]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });
const Event = mongoose.model('Event', eventSchema);
module.exports = Event; 