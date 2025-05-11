const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  iconUrl: String,
  category: {
    type: String,
    enum: ['attendance', 'engagement', 'creator', 'special', 'achievement'],
    default: 'attendance'
  },
  level: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  earnedAt: {
    type: Date,
    default: Date.now
  },
  earnedFrom: {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    action: String,
    details: mongoose.Schema.Types.Mixed
  },
  displayed: {
    type: Boolean,
    default: true
  }
});

const pointTransactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['earned', 'spent', 'expired', 'adjustment'],
    required: true
  },
  source: {
    type: String,
    enum: ['event_attendance', 'ticket_purchase', 'event_review', 'referral', 'engagement', 'admin', 'other'],
    required: true
  },
  description: String,
  metadata: {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket'
    },
    referralId: String,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  expiryDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const userRewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  points: {
    balance: {
      type: Number,
      default: 0
    },
    lifetime: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    expiringSoon: {
      type: Number,
      default: 0
    }
  },
  level: {
    current: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  badges: [badgeSchema],
  transactions: [pointTransactionSchema],
  streaks: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastActivity: Date
  },
  redemptionHistory: [{
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward'
    },
    rewardName: String,
    pointsCost: Number,
    redeemedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'delivered', 'cancelled'],
      default: 'pending'
    },
    codeGenerated: String,
    expiryDate: Date
  }],
  settings: {
    notifyOnPointsEarned: {
      type: Boolean,
      default: true
    },
    notifyOnBadgesEarned: {
      type: Boolean,
      default: true
    },
    notifyOnLevelUp: {
      type: Boolean,
      default: true
    },
    displayBadgesOnProfile: {
      type: Boolean,
      default: true
    },
    displayLevelOnProfile: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

userRewardSchema.index({ userId: 1 });
userRewardSchema.index({ 'points.balance': -1 });
userRewardSchema.index({ 'level.current': 1 });
userRewardSchema.index({ 'badges.name': 1 });
userRewardSchema.index({ 'transactions.createdAt': -1 });

userRewardSchema.statics.addPoints = async function(userId, amount, source, description = '', metadata = {}, expiryDate = null) {
  const reward = await this.findOne({ userId });
  
  if (!reward) {
    return await this.create({
      userId,
      points: {
        balance: amount,
        lifetime: amount,
        pending: 0,
        expiringSoon: expiryDate ? amount : 0
      },
      transactions: [{
        amount,
        type: 'earned',
        source,
        description,
        metadata,
        expiryDate
      }]
    });
  }
  
  reward.points.balance += amount;
  reward.points.lifetime += amount;
  
  if (expiryDate) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.setDate(now.getDate() + 30));
    
    if (expiryDate < thirtyDaysFromNow) {
      reward.points.expiringSoon += amount;
    }
  }
  
  reward.transactions.push({
    amount,
    type: 'earned',
    source,
    description,
    metadata,
    expiryDate
  });
  
  await this.checkAndUpdateLevel(reward);
  
  return await reward.save();
};

userRewardSchema.statics.checkAndUpdateLevel = async function(reward) {
  const levelThresholds = {
    bronze: 0,
    silver: 1000,
    gold: 5000,
    platinum: 15000,
    diamond: 50000
  };
  
  const lifetime = reward.points.lifetime;
  
  let newLevel = 'bronze';
  
  if (lifetime >= levelThresholds.diamond) {
    newLevel = 'diamond';
  } else if (lifetime >= levelThresholds.platinum) {
    newLevel = 'platinum';
  } else if (lifetime >= levelThresholds.gold) {
    newLevel = 'gold';
  } else if (lifetime >= levelThresholds.silver) {
    newLevel = 'silver';
  }
  
  if (newLevel !== reward.level.current) {
    reward.level.current = newLevel;
    reward.level.progress = 0;
    reward.level.updatedAt = new Date();
    return true;
  }
  
  const nextLevel = {
    bronze: 'silver',
    silver: 'gold',
    gold: 'platinum',
    platinum: 'diamond',
    diamond: 'diamond'
  };
  
  const nextLevelThreshold = levelThresholds[nextLevel[reward.level.current]];
  const currentLevelThreshold = levelThresholds[reward.level.current];
  
  if (nextLevelThreshold === currentLevelThreshold) {
    reward.level.progress = 100;
  } else {
    reward.level.progress = Math.floor(((lifetime - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100);
  }
  
  return false;
};

const UserReward = mongoose.model('UserReward', userRewardSchema);

module.exports = UserReward; 