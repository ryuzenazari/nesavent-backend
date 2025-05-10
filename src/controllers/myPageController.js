const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const CreatorFollower = require('../models/CreatorFollower');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Get My Page details for the logged-in creator
 */
const getMyPage = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    if (!['creator', 'staff_creator', 'admin'].includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak. Hanya creator yang memiliki My Page.' 
      });
    }

    // Jika myPage belum ada, buat slug default berdasarkan nama
    if (!user.myPage || !user.myPage.slug) {
      const defaultSlug = user.name.toLowerCase().replace(/\s+/g, '-');
      if (!user.myPage) {
        user.myPage = { slug: defaultSlug };
      } else {
        user.myPage.slug = defaultSlug;
      }
      await user.save();
    }

    res.status(200).json({
      success: true,
      myPage: user.myPage
    });
  } catch (error) {
    logger.error('Error getting my page:', { userId: req.userId, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat mengambil data My Page' 
    });
  }
};

/**
 * Update My Page details
 */
const updateMyPage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    if (!['creator', 'staff_creator', 'admin'].includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak. Hanya creator yang memiliki My Page.' 
      });
    }

    const {
      slug,
      bio,
      socialMedia,
      organization,
      contact,
      isPublic
    } = req.body;

    // Inisialisasi myPage jika belum ada
    if (!user.myPage) {
      user.myPage = {};
    }

    // Update slug jika disediakan dan validasi unik
    if (slug) {
      const slugExists = await User.findOne({ 
        '_id': { $ne: userId }, 
        'myPage.slug': slug 
      });
      
      if (slugExists) {
        return res.status(409).json({ 
          success: false, 
          message: 'Slug sudah digunakan. Silakan gunakan yang lain.' 
        });
      }
      
      user.myPage.slug = slug;
    }

    // Update field lainnya
    if (bio !== undefined) user.myPage.bio = bio;
    if (socialMedia !== undefined) user.myPage.socialMedia = socialMedia;
    if (organization !== undefined) user.myPage.organization = organization;
    if (contact !== undefined) user.myPage.contact = contact;
    if (isPublic !== undefined) user.myPage.isPublic = isPublic;

    // Update timestamp
    user.myPage.lastUpdated = new Date();
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'My Page berhasil diperbarui',
      myPage: user.myPage
    });
  } catch (error) {
    logger.error('Error updating my page:', { userId: req.userId, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat memperbarui My Page' 
    });
  }
};

/**
 * Upload cover image untuk My Page
 */
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tidak ada file yang diunggah' 
      });
    }

    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    if (!['creator', 'staff_creator', 'admin'].includes(user.role)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak. Hanya creator yang memiliki My Page.' 
      });
    }

    // Inisialisasi myPage jika belum ada
    if (!user.myPage) {
      user.myPage = {};
    }

    // Hapus gambar cover lama jika ada
    if (user.myPage.coverImage) {
      const oldCoverPath = path.join(__dirname, '../../', user.myPage.coverImage);
      if (fs.existsSync(oldCoverPath)) {
        fs.unlinkSync(oldCoverPath);
      }
    }

    // Set path untuk gambar cover baru
    user.myPage.coverImage = `/uploads/creators/${req.file.filename}`;
    
    // Update timestamp
    user.myPage.lastUpdated = new Date();
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cover image berhasil diunggah',
      coverImage: user.myPage.coverImage
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error('Error uploading cover image:', { userId: req.userId, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat mengunggah cover image' 
    });
  }
};

/**
 * Get public My Page details by slug
 */
const getPublicMyPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const creator = await User.findOne({ 'myPage.slug': slug })
      .select('name email profileImage role myPage createdAt');
    
    if (!creator) {
      return res.status(404).json({ 
        success: false, 
        message: 'Creator tidak ditemukan' 
      });
    }

    if (!creator.myPage || !creator.myPage.isPublic) {
      return res.status(403).json({ 
        success: false, 
        message: 'My Page ini tidak tersedia untuk publik' 
      });
    }

    // Ambil event-event yang dibuat oleh creator
    const events = await Event.find({
      createdBy: creator._id,
      isActive: true
    })
    .select('title description date time location category organizer image ticketTypes availableTickets')
    .sort({ date: 1 })
    .limit(10);

    // Hitung jumlah follower
    const followersCount = await CreatorFollower.countDocuments({ creator: creator._id });

    // Jika user terautentikasi, periksa apakah user adalah follower
    let isFollowing = false;
    if (req.userId) {
      const followerRecord = await CreatorFollower.findOne({
        creator: creator._id,
        follower: req.userId
      });
      isFollowing = !!followerRecord;
    }

    // Response
    res.status(200).json({
      success: true,
      creator: {
        _id: creator._id,
        name: creator.name,
        profileImage: creator.profileImage,
        role: creator.role,
        myPage: creator.myPage,
        joinedAt: creator.createdAt,
        followersCount,
        isFollowing
      },
      events
    });
  } catch (error) {
    logger.error('Error getting public my page:', { slug: req.params.slug, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat mengambil halaman creator' 
    });
  }
};

/**
 * Follow a creator
 */
const followCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const followerId = req.userId;

    // Periksa apakah creator ada dan bukan diri sendiri
    if (creatorId === followerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Anda tidak dapat mengikuti diri sendiri' 
      });
    }

    const creator = await User.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ 
        success: false, 
        message: 'Creator tidak ditemukan' 
      });
    }

    if (!['creator', 'staff_creator', 'admin'].includes(creator.role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User yang dipilih bukan seorang creator' 
      });
    }

    // Buat atau update record follower
    const followerRecord = await CreatorFollower.findOneAndUpdate(
      { creator: creatorId, follower: followerId },
      { 
        creator: creatorId,
        follower: followerId,
        followedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Update statistik follower pada myPage creator
    await User.findByIdAndUpdate(creatorId, {
      $inc: { 'myPage.stats.followers': 1 }
    });

    res.status(200).json({
      success: true,
      message: `Anda sekarang mengikuti ${creator.name}`,
      followerId: followerId,
      creatorId: creatorId
    });
  } catch (error) {
    // Handle duplicate key error (already following)
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'Anda sudah mengikuti creator ini' 
      });
    }

    logger.error('Error following creator:', { 
      creatorId: req.params.creatorId, 
      followerId: req.userId, 
      error: error.message 
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat mengikuti creator' 
    });
  }
};

/**
 * Unfollow a creator
 */
const unfollowCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const followerId = req.userId;

    // Periksa apakah creator ada
    const creator = await User.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ 
        success: false, 
        message: 'Creator tidak ditemukan' 
      });
    }

    // Delete follower record
    const deleteResult = await CreatorFollower.findOneAndDelete({
      creator: creatorId,
      follower: followerId
    });

    if (!deleteResult) {
      return res.status(404).json({ 
        success: false, 
        message: 'Anda tidak mengikuti creator ini' 
      });
    }

    // Update statistik follower pada myPage creator
    await User.findByIdAndUpdate(creatorId, {
      $inc: { 'myPage.stats.followers': -1 }
    });

    res.status(200).json({
      success: true,
      message: `Anda berhenti mengikuti ${creator.name}`,
      followerId: followerId,
      creatorId: creatorId
    });
  } catch (error) {
    logger.error('Error unfollowing creator:', { 
      creatorId: req.params.creatorId, 
      followerId: req.userId, 
      error: error.message 
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat berhenti mengikuti creator' 
    });
  }
};

/**
 * Get my followers list
 */
const getMyFollowers = async (req, res) => {
  try {
    const creatorId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Temukan follower
    const followers = await CreatorFollower.find({ creator: creatorId })
      .populate('follower', 'name email profileImage')
      .sort({ followedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CreatorFollower.countDocuments({ creator: creatorId });

    res.status(200).json({
      success: true,
      followers: followers.map(f => ({
        _id: f.follower._id,
        name: f.follower.name,
        email: f.follower.email,
        profileImage: f.follower.profileImage,
        followedAt: f.followedAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting followers:', { creatorId: req.userId, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat mengambil daftar followers' 
    });
  }
};

/**
 * Get list of creators I'm following
 */
const getMyFollowings = async (req, res) => {
  try {
    const followerId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Temukan creator yang difollow
    const followings = await CreatorFollower.find({ follower: followerId })
      .populate('creator', 'name email profileImage myPage.slug myPage.bio')
      .sort({ followedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CreatorFollower.countDocuments({ follower: followerId });

    res.status(200).json({
      success: true,
      followings: followings.map(f => ({
        _id: f.creator._id,
        name: f.creator.name,
        email: f.creator.email,
        profileImage: f.creator.profileImage,
        slug: f.creator.myPage?.slug,
        bio: f.creator.myPage?.bio,
        followedAt: f.followedAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting followings:', { followerId: req.userId, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat mengambil daftar following' 
    });
  }
};

module.exports = {
  getMyPage,
  updateMyPage,
  uploadCoverImage,
  getPublicMyPageBySlug,
  followCreator,
  unfollowCreator,
  getMyFollowers,
  getMyFollowings
}; 