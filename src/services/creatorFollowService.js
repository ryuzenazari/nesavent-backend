const CreatorFollower = require('../models/CreatorFollower');
const User = require('../models/User');
const Event = require('../models/Event');
const mongoose = require('mongoose');

const followCreator = async (userId, creatorId) => {
  const creator = await User.findById(creatorId);
  
  if (!creator) {
    throw new Error('Creator tidak ditemukan');
  }
  
  if (!['creator', 'staff_creator'].includes(creator.role)) {
    throw new Error('User yang dipilih bukan seorang creator');
  }
  
  if (userId === creatorId) {
    throw new Error('Anda tidak dapat follow diri sendiri');
  }
  
  const existingFollow = await CreatorFollower.findOne({
    creator: creatorId,
    follower: userId
  });
  
  if (existingFollow) {
    throw new Error('Anda sudah mengikuti creator ini');
  }
  
  const follow = new CreatorFollower({
    creator: creatorId,
    follower: userId
  });
  
  await follow.save();
  
  await User.findByIdAndUpdate(creatorId, {
    $inc: { 'myPage.stats.followers': 1 }
  });
  
  return follow;
};

const unfollowCreator = async (userId, creatorId) => {
  const follow = await CreatorFollower.findOne({
    creator: creatorId,
    follower: userId
  });
  
  if (!follow) {
    throw new Error('Anda belum mengikuti creator ini');
  }
  
  await CreatorFollower.findByIdAndDelete(follow._id);
  
  await User.findByIdAndUpdate(creatorId, {
    $inc: { 'myPage.stats.followers': -1 }
  });
  
  return { success: true, message: 'Berhasil unfollow creator' };
};

const getFollowers = async (creatorId, options = {}) => {
  const { page = 1, limit = 10 } = options;
  
  const total = await CreatorFollower.countDocuments({ creator: creatorId });
  
  const followers = await CreatorFollower.find({ creator: creatorId })
    .sort({ followedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('follower', 'name profileImage')
    .lean();
  
  return {
    followers,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFollowers: total
    }
  };
};

const getFollowing = async (userId, options = {}) => {
  const { page = 1, limit = 10 } = options;
  
  const total = await CreatorFollower.countDocuments({ follower: userId });
  
  const following = await CreatorFollower.find({ follower: userId })
    .sort({ followedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('creator', 'name profileImage myPage.bio myPage.socialMedia')
    .lean();
  
  return {
    following,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFollowing: total
    }
  };
};

const updateNotificationSettings = async (userId, creatorId, settings) => {
  const follow = await CreatorFollower.findOne({
    creator: creatorId,
    follower: userId
  });
  
  if (!follow) {
    throw new Error('Anda belum mengikuti creator ini');
  }
  
  follow.notifications = {
    ...follow.notifications,
    ...settings
  };
  
  await follow.save();
  
  return follow;
};

const getFollowStatus = async (userId, creatorId) => {
  const follow = await CreatorFollower.findOne({
    creator: creatorId,
    follower: userId
  });
  
  return {
    isFollowing: !!follow,
    followedAt: follow ? follow.followedAt : null,
    notificationSettings: follow ? follow.notifications : null
  };
};

const getFollowersForNewEvent = async (creatorId) => {
  return CreatorFollower.find({
    creator: creatorId,
    'notifications.newEvents': true
  })
    .select('follower')
    .lean();
};

const getFollowersForEventUpdates = async (eventId) => {
  const event = await Event.findById(eventId);
  
  if (!event) {
    throw new Error('Event tidak ditemukan');
  }
  
  return CreatorFollower.find({
    creator: event.creator,
    'notifications.eventUpdates': true
  })
    .select('follower')
    .lean();
};

const getTopCreators = async (limit = 10) => {
  const creators = await User.aggregate([
    {
      $match: {
        role: { $in: ['creator', 'staff_creator'] }
      }
    },
    {
      $project: {
        name: 1,
        profileImage: 1,
        followers: '$myPage.stats.followers',
        bio: '$myPage.bio'
      }
    },
    {
      $sort: { followers: -1 }
    },
    {
      $limit: limit
    }
  ]);
  
  return creators;
};

const getSuggestedCreators = async (userId, limit = 5) => {
  const following = await CreatorFollower.find({ follower: userId })
    .select('creator')
    .lean();
  
  const followingIds = following.map(f => f.creator);
  
  const creators = await User.find({
    _id: { $ne: userId, $nin: followingIds },
    role: { $in: ['creator', 'staff_creator'] }
  })
    .select('name profileImage myPage.bio myPage.stats.followers')
    .sort({ 'myPage.stats.followers': -1 })
    .limit(limit)
    .lean();
  
  return creators;
};

module.exports = {
  followCreator,
  unfollowCreator,
  getFollowers,
  getFollowing,
  updateNotificationSettings,
  getFollowStatus,
  getFollowersForNewEvent,
  getFollowersForEventUpdates,
  getTopCreators,
  getSuggestedCreators
}; 