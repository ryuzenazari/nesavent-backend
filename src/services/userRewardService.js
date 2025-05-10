const UserReward = require('../models/UserReward');
const mongoose = require('mongoose');

const addPoints = async (userId, amount, source, description = '', metadata = {}, expiryDate = null) => {
  try {
    const result = await UserReward.addPoints(userId, amount, source, description, metadata, expiryDate);
    return result;
  } catch (error) {
    throw new Error(`Failed to add points: ${error.message}`);
  }
};

const usePoints = async (userId, amount, reason) => {
  try {
    const userReward = await UserReward.findOne({ userId });
    
    if (!userReward) {
      throw new Error('User reward record not found');
    }
    
    if (userReward.points.balance < amount) {
      throw new Error('Insufficient points balance');
    }
    
    userReward.points.balance -= amount;
    
    userReward.transactions.push({
      amount: -amount,
      type: 'spent',
      source: 'other',
      description: reason || 'Points redemption',
      createdAt: new Date()
    });
    
    await userReward.save();
    return userReward;
  } catch (error) {
    throw new Error(`Failed to use points: ${error.message}`);
  }
};

const getUserPoints = async (userId) => {
  try {
    const userReward = await UserReward.findOne({ userId });
    
    if (!userReward) {
      return {
        balance: 0,
        lifetime: 0,
        pending: 0,
        expiringSoon: 0,
        level: 'bronze',
        progress: 0
      };
    }
    
    return {
      ...userReward.points.toObject(),
      level: userReward.level.current,
      progress: userReward.level.progress
    };
  } catch (error) {
    throw new Error(`Failed to get user points: ${error.message}`);
  }
};

const getPointsTransactions = async (userId, limit = 20, skip = 0) => {
  try {
    const userReward = await UserReward.findOne({ userId }, { transactions: 1 });
    
    if (!userReward) {
      return { transactions: [], total: 0 };
    }
    
    const transactions = userReward.transactions || [];
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(skip, skip + limit);
    
    return {
      transactions: paginatedTransactions,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get points transactions: ${error.message}`);
  }
};

const awardBadge = async (userId, badgeData) => {
  try {
    const {
      name,
      description,
      iconUrl,
      category,
      level,
      earnedFrom
    } = badgeData;
    
    const userReward = await UserReward.findOne({ userId });
    
    if (!userReward) {
      const newUserReward = new UserReward({
        userId,
        badges: [{
          name,
          description,
          iconUrl,
          category,
          level,
          earnedAt: new Date(),
          earnedFrom,
          displayed: true
        }]
      });
      
      await newUserReward.save();
      return newUserReward;
    }
    
    const existingBadge = userReward.badges.find(
      badge => badge.name === name
    );
    
    if (existingBadge) {
      return userReward;
    }
    
    userReward.badges.push({
      name,
      description,
      iconUrl,
      category,
      level,
      earnedAt: new Date(),
      earnedFrom,
      displayed: true
    });
    
    await userReward.save();
    return userReward;
  } catch (error) {
    throw new Error(`Failed to award badge: ${error.message}`);
  }
};

const updateBadgeVisibility = async (userId, badgeId, displayed) => {
  try {
    const result = await UserReward.updateOne(
      { userId, 'badges._id': badgeId },
      { $set: { 'badges.$.displayed': displayed } }
    );
    
    if (result.nModified === 0) {
      throw new Error('Badge not found or not owned by this user');
    }
    
    return { success: true, message: 'Badge visibility updated' };
  } catch (error) {
    throw new Error(`Failed to update badge visibility: ${error.message}`);
  }
};

const getUserBadges = async (userId) => {
  try {
    const userReward = await UserReward.findOne({ userId }, { badges: 1 });
    
    if (!userReward) {
      return { badges: [] };
    }
    
    return { badges: userReward.badges || [] };
  } catch (error) {
    throw new Error(`Failed to get user badges: ${error.message}`);
  }
};

const redeemReward = async (userId, rewardData) => {
  try {
    const { rewardId, rewardName, pointsCost, expiryDays } = rewardData;
    
    const userReward = await UserReward.findOne({ userId });
    
    if (!userReward) {
      throw new Error('User reward record not found');
    }
    
    if (userReward.points.balance < pointsCost) {
      throw new Error('Insufficient points balance');
    }
    
    userReward.points.balance -= pointsCost;
    
    const expiryDate = expiryDays 
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) 
      : null;
    
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    userReward.redemptionHistory.push({
      rewardId,
      rewardName,
      pointsCost,
      redeemedAt: new Date(),
      status: 'pending',
      codeGenerated: code,
      expiryDate
    });
    
    userReward.transactions.push({
      amount: -pointsCost,
      type: 'spent',
      source: 'other',
      description: `Redemption: ${rewardName}`,
      createdAt: new Date()
    });
    
    await userReward.save();
    
    return {
      success: true,
      redemption: {
        rewardId,
        rewardName,
        pointsCost,
        code,
        expiryDate,
        status: 'pending'
      }
    };
  } catch (error) {
    throw new Error(`Failed to redeem reward: ${error.message}`);
  }
};

const getRedemptionHistory = async (userId) => {
  try {
    const userReward = await UserReward.findOne({ userId }, { redemptionHistory: 1 });
    
    if (!userReward) {
      return { redemptions: [] };
    }
    
    return { redemptions: userReward.redemptionHistory || [] };
  } catch (error) {
    throw new Error(`Failed to get redemption history: ${error.message}`);
  }
};

const updateRedemptionStatus = async (userId, redemptionId, status) => {
  try {
    const result = await UserReward.updateOne(
      { userId, 'redemptionHistory._id': redemptionId },
      { $set: { 'redemptionHistory.$.status': status } }
    );
    
    if (result.nModified === 0) {
      throw new Error('Redemption not found or not owned by this user');
    }
    
    return { success: true, message: `Redemption status updated to ${status}` };
  } catch (error) {
    throw new Error(`Failed to update redemption status: ${error.message}`);
  }
};

const updateUserStreak = async (userId) => {
  try {
    const userReward = await UserReward.findOne({ userId });
    
    if (!userReward) {
      const newUserReward = new UserReward({
        userId,
        streaks: {
          current: 1,
          longest: 1,
          lastActivity: new Date()
        }
      });
      
      await newUserReward.save();
      return newUserReward;
    }
    
    const lastActivity = userReward.streaks.lastActivity;
    const today = new Date();
    
    if (!lastActivity) {
      userReward.streaks.current = 1;
      userReward.streaks.longest = Math.max(1, userReward.streaks.longest);
      userReward.streaks.lastActivity = today;
    } else {
      const lastDate = new Date(lastActivity);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day, no streak update
      } else if (diffDays === 1) {
        // Consecutive day
        userReward.streaks.current += 1;
        userReward.streaks.longest = Math.max(userReward.streaks.current, userReward.streaks.longest);
        userReward.streaks.lastActivity = today;
      } else {
        // Streak broken
        userReward.streaks.current = 1;
        userReward.streaks.lastActivity = today;
      }
    }
    
    await userReward.save();
    return userReward;
  } catch (error) {
    throw new Error(`Failed to update user streak: ${error.message}`);
  }
};

const getUserRewardProfile = async (userId) => {
  try {
    const userReward = await UserReward.findOne({ userId });
    
    if (!userReward) {
      return {
        points: {
          balance: 0,
          lifetime: 0,
          expiringSoon: 0
        },
        level: {
          current: 'bronze',
          progress: 0
        },
        badges: [],
        streaks: {
          current: 0,
          longest: 0
        }
      };
    }
    
    return {
      points: userReward.points,
      level: userReward.level,
      badges: userReward.badges.filter(badge => badge.displayed),
      streaks: userReward.streaks,
      settings: userReward.settings
    };
  } catch (error) {
    throw new Error(`Failed to get user reward profile: ${error.message}`);
  }
};

const updateRewardSettings = async (userId, settings) => {
  try {
    const userReward = await UserReward.findOne({ userId });
    
    if (!userReward) {
      const newUserReward = new UserReward({
        userId,
        settings
      });
      
      await newUserReward.save();
      return { success: true, message: 'Reward settings created' };
    }
    
    userReward.settings = {
      ...userReward.settings,
      ...settings
    };
    
    await userReward.save();
    return { success: true, message: 'Reward settings updated' };
  } catch (error) {
    throw new Error(`Failed to update reward settings: ${error.message}`);
  }
};

module.exports = {
  addPoints,
  usePoints,
  getUserPoints,
  getPointsTransactions,
  awardBadge,
  updateBadgeVisibility,
  getUserBadges,
  redeemReward,
  getRedemptionHistory,
  updateRedemptionStatus,
  updateUserStreak,
  getUserRewardProfile,
  updateRewardSettings
}; 