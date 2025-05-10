const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'free'],
    required: true
  },
  value: {
    type: Number,
    required: function() {
      return this.type !== 'free';
    },
    min: 0
  },
  maxDiscount: {
    type: Number,
    min: 0,
    default: null
  },
  minPurchase: {
    type: Number,
    min: 0,
    default: 0
  },
  description: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    min: 0,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    min: 0,
    default: 1
  },
  isActive: {
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
  },
  applicableEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  applicableEventCategories: [String],
  exclusions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  allowedUserTypes: {
    type: [String],
    enum: ['all', 'regular', 'student', 'creator'],
    default: ['all']
  },
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usageCount: {
      type: Number,
      default: 1
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

promoCodeSchema.index({ code: 1 }, { unique: true });
promoCodeSchema.index({ startDate: 1, endDate: 1 });
promoCodeSchema.index({ isActive: 1 });
promoCodeSchema.index({ 'usedBy.userId': 1 });
promoCodeSchema.index({ applicableEvents: 1 });
promoCodeSchema.index({ applicableEventCategories: 1 });

promoCodeSchema.statics.validatePromoCode = async function(code, userId, eventId, purchaseAmount) {
  try {
    const promoCode = await this.findOne({ 
      code, 
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    
    if (!promoCode) {
      throw new Error('Invalid or expired promo code');
    }
    
    // Check usage limit
    if (promoCode.usageLimit !== null && promoCode.usageCount >= promoCode.usageLimit) {
      throw new Error('Promo code usage limit reached');
    }
    
    // Check minimum purchase amount
    if (purchaseAmount < promoCode.minPurchase) {
      throw new Error(`Minimum purchase amount is ${promoCode.minPurchase}`);
    }
    
    // Check per-user limit
    const userUsage = promoCode.usedBy.find(
      usage => usage.userId.toString() === userId.toString()
    );
    
    if (userUsage && userUsage.usageCount >= promoCode.perUserLimit) {
      throw new Error('You have reached the usage limit for this promo code');
    }
    
    // Check applicable events if specified
    if (promoCode.applicableEvents.length > 0 && !promoCode.applicableEvents.includes(eventId)) {
      throw new Error('This promo code is not applicable for this event');
    }
    
    // Calculate discount
    let discountAmount = 0;
    
    if (promoCode.type === 'percentage') {
      discountAmount = (purchaseAmount * promoCode.value) / 100;
      if (promoCode.maxDiscount !== null) {
        discountAmount = Math.min(discountAmount, promoCode.maxDiscount);
      }
    } else if (promoCode.type === 'fixed') {
      discountAmount = promoCode.value;
    } else if (promoCode.type === 'free') {
      discountAmount = purchaseAmount;
    }
    
    return {
      promoCodeId: promoCode._id,
      code: promoCode.code,
      discountAmount,
      finalAmount: Math.max(0, purchaseAmount - discountAmount)
    };
  } catch (error) {
    throw new Error(`Promo code validation failed: ${error.message}`);
  }
};

promoCodeSchema.statics.redeemPromoCode = async function(code, userId, eventId, purchaseAmount) {
  try {
    const validation = await this.validatePromoCode(code, userId, eventId, purchaseAmount);
    const promoCode = await this.findById(validation.promoCodeId);
    
    promoCode.usageCount += 1;
    
    const userIndex = promoCode.usedBy.findIndex(
      usage => usage.userId.toString() === userId.toString()
    );
    
    if (userIndex === -1) {
      promoCode.usedBy.push({
        userId,
        usageCount: 1,
        lastUsed: new Date()
      });
    } else {
      promoCode.usedBy[userIndex].usageCount += 1;
      promoCode.usedBy[userIndex].lastUsed = new Date();
    }
    
    await promoCode.save();
    return validation;
  } catch (error) {
    throw new Error(`Failed to redeem promo code: ${error.message}`);
  }
};

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

module.exports = PromoCode; 