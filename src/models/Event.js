const mongoose = require('mongoose');
const slugify = require('slugify');
const mongoosePaginate = require('mongoose-paginate-v2');
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
    benefits: [
      {
        type: String
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: true
  }
);
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Judul event harus diisi'],
      trim: true,
      maxlength: [100, 'Judul event tidak boleh lebih dari 100 karakter']
    },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Deskripsi event harus diisi'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Kategori event harus diisi'],
      enum: ['Seminar', 'Workshop', 'Konser', 'Pameran', 'Lainnya']
    },
    startDate: {
      type: Date,
      required: [true, 'Tanggal mulai event harus diisi']
    },
    endDate: {
      type: Date,
      required: [true, 'Tanggal selesai event harus diisi']
    },
    location: {
      type: String,
      required: [true, 'Lokasi event harus diisi']
    },
    image: {
      type: String,
      required: [true, 'Gambar event harus diisi']
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
    ticketTypes: [
      {
        name: {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        quantity: {
          type: Number,
          required: true
        },
        sold: {
          type: Number,
          default: 0
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
        }
      }
    ],
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringPattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', null],
      default: null
    },
    recurringEndDate: {
      type: Date
    },
    recurringInstances: [
      {
        startDate: Date,
        endDate: Date,
        status: {
          type: String,
          enum: ['scheduled', 'completed', 'cancelled'],
          default: 'scheduled'
        }
      }
    ],
    waitingList: {
      isEnabled: {
        type: Boolean,
        default: false
      },
      maxCapacity: {
        type: Number
      },
      currentCount: {
        type: Number,
        default: 0
      }
    },
    promoCodes: [
      {
        code: {
          type: String,
          required: true
        },
        discountType: {
          type: String,
          enum: ['percentage', 'fixed'],
          required: true
        },
        discountValue: {
          type: Number,
          required: true
        },
        maxUses: {
          type: Number
        },
        usedCount: {
          type: Number,
          default: 0
        },
        startDate: {
          type: Date,
          required: true
        },
        endDate: {
          type: Date,
          required: true
        },
        isActive: {
          type: Boolean,
          default: true
        }
      }
    ],
    ratings: {
      average: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    },
    refundPolicy: {
      isEnabled: {
        type: Boolean,
        default: false
      },
      allowedUntil: {
        type: Date
      }
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],
      default: 'draft'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);
eventSchema.index({
  creator: 1
});
eventSchema.index({
  status: 1
});
eventSchema.index({
  startDate: 1
});
eventSchema.index({
  category: 1
});
eventSchema.plugin(mongoosePaginate);
eventSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, {
      lower: true
    });
  }
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  if (this.isModified('isRecurring') && this.isRecurring && this.recurringPattern) {
    this.generateRecurringInstances();
  }
  next();
});
eventSchema.methods.generateRecurringInstances = function () {
  const instances = [];
  let currentDate = new Date(this.startDate);
  const endDate = new Date(this.recurringEndDate);
  while (currentDate <= endDate) {
    const instanceEndDate = new Date(currentDate);
    instanceEndDate.setHours(this.endDate.getHours(), this.endDate.getMinutes());
    instances.push({
      startDate: new Date(currentDate),
      endDate: instanceEndDate,
      status: 'scheduled'
    });
    switch (this.recurringPattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
  }
  this.recurringInstances = instances;
};
eventSchema.methods.isEarlyBirdActive = function (ticketType) {
  if (!ticketType.earlyBirdPrice || !ticketType.earlyBirdEndDate) {
    return false;
  }
  return new Date() <= new Date(ticketType.earlyBirdEndDate);
};
eventSchema.methods.isPromoCodeValid = function (code) {
  const promoCode = this.promoCodes.find(pc => pc.code === code);
  if (!promoCode) return false;
  const now = new Date();
  return (
    promoCode.isActive &&
    now >= new Date(promoCode.startDate) &&
    now <= new Date(promoCode.endDate) &&
    (!promoCode.maxUses || promoCode.usedCount < promoCode.maxUses)
  );
};
eventSchema.methods.calculateRefundAmount = function (ticketPrice) {
  if (!this.refundPolicy.isEnabled) return 0;
  const now = new Date();
  if (now > new Date(this.refundPolicy.allowedUntil)) return 0;
  return ticketPrice;
};
eventSchema.methods.addToWaitingList = function () {
  if (!this.waitingList.isEnabled) return false;
  if (this.waitingList.currentCount >= this.waitingList.maxCapacity) return false;
  this.waitingList.currentCount += 1;
  return true;
};
const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
