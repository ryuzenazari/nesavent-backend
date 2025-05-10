const mongoose = require('mongoose');

const eventTemplateSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  duration: {
    type: Number,
    default: 120
  },
  defaultLocation: {
    name: String,
    address: String,
    city: String,
    province: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  defaultBanner: {
    type: String
  },
  ticketTypes: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    defaultPrice: {
      type: Number,
      required: true
    },
    defaultQuantity: {
      type: Number,
      default: 100
    },
    benefits: [String],
    color: String
  }],
  schedule: [{
    name: String,
    durationMinutes: Number,
    description: String
  }],
  formFields: [{
    name: String,
    label: String,
    type: {
      type: String,
      enum: ['text', 'number', 'email', 'select', 'checkbox', 'date', 'file'],
      default: 'text'
    },
    required: Boolean,
    options: [String],
    placeholder: String
  }],
  emailTemplates: {
    confirmation: {
      subject: String,
      body: String
    },
    reminder: {
      subject: String,
      body: String,
      sendHoursBefore: Number
    },
    postEvent: {
      subject: String,
      body: String
    }
  },
  socialShare: {
    defaultMessage: String,
    hashtags: [String],
    platforms: [{
      name: String,
      enabled: Boolean,
      customMessage: String
    }]
  },
  settings: {
    allowTransfers: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    hideAttendeeList: {
      type: Boolean,
      default: false
    },
    allowRatings: {
      type: Boolean,
      default: true
    },
    sendAttendeeUpdates: {
      type: Boolean,
      default: true
    },
    trackAnalytics: {
      type: Boolean,
      default: true
    }
  },
  useCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date
}, {
  timestamps: true
});

eventTemplateSchema.index({ creatorId: 1, name: 1 }, { unique: true });
eventTemplateSchema.index({ isPublic: 1, category: 1 });

const EventTemplate = mongoose.model('EventTemplate', eventTemplateSchema);

module.exports = EventTemplate; 