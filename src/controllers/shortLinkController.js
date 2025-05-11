const { validationResult } = require('express-validator');
const shortLinkService = require('../services/shortLinkService');
const logger = require('../utils/logger');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const ShortLink = require('../models/ShortLink');
const mongoose = require('mongoose');

const getTargetUrl = shortLink => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (shortLink.targetType === 'external') {
    return shortLink.customUrl;
  }
  if (shortLink.targetType === 'page') {
    if (shortLink.customUrl.startsWith('http')) {
      return shortLink.customUrl;
    }
    return `${baseUrl}${shortLink.customUrl}`;
  }
  if (shortLink.targetType === 'event' && shortLink.targetId) {
    return `${baseUrl}/events/${shortLink.targetId}`;
  }
  if (shortLink.targetType === 'ticket' && shortLink.targetId) {
    return `${baseUrl}/tickets/${shortLink.targetId}`;
  }
  return baseUrl;
};

const redirectShortLink = async (req, res) => {
  try {
    const { code } = req.params;
    const shortLink = await shortLinkService.getShortLink(code);
    if (!shortLink) {
      logger.warn(`Shortlink tidak ditemukan: ${code}`);
      return res.status(404).render('not-found', {
        title: 'Link Tidak Ditemukan',
        message: 'Short link yang Anda cari tidak ditemukan atau sudah tidak aktif.'
      });
    }
    shortLinkService.recordVisit(code);
    const targetUrl = getTargetUrl(shortLink);
    res.redirect(targetUrl);
  } catch (error) {
    logger.error(`Error saat redirect shortlink: ${error.message}`);
    res.status(500).render('error', {
      title: 'Terjadi Kesalahan',
      message: 'Mohon maaf, terjadi kesalahan saat memproses link.'
    });
  }
};

const getShortLinkInfo = async (req, res) => {
  try {
    const { code } = req.params;
    const shortLink = await shortLinkService.getShortLink(code);
    if (!shortLink) {
      return res.status(404).json({
        message: 'Shortlink tidak ditemukan'
      });
    }
    res.status(200).json({
      shortLink: {
        code: shortLink.code,
        targetType: shortLink.targetType,
        targetId: shortLink.targetId,
        customUrl: shortLink.customUrl,
        visits: shortLink.visits,
        isActive: shortLink.isActive,
        expiresAt: shortLink.expiresAt,
        createdAt: shortLink.createdAt,
        updatedAt: shortLink.updatedAt,
        createdBy: {
          _id: shortLink.createdBy._id,
          name: shortLink.createdBy.name,
          email: shortLink.createdBy.email
        }
      }
    });
  } catch (error) {
    logger.error(`Error saat mendapatkan info shortlink: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat memproses permintaan',
      error: error.message
    });
  }
};

const createNewShortLink = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { targetType, targetId, customUrl, expiresAt } = req.body;
    if (
      (targetType === 'event' || targetType === 'ticket') &&
      !mongoose.Types.ObjectId.isValid(targetId)
    ) {
      return res.status(400).json({
        message: 'ID target tidak valid'
      });
    }
    if (targetType === 'event') {
      const event = await Event.findById(targetId);
      if (!event) {
        return res.status(404).json({
          message: 'Event tidak ditemukan'
        });
      }
    } else if (targetType === 'ticket') {
      const ticket = await Ticket.findById(targetId);
      if (!ticket) {
        return res.status(404).json({
          message: 'Tiket tidak ditemukan'
        });
      }
    }
    const linkData = {
      targetType,
      targetModel: targetType === 'event' ? 'Event' : targetType === 'ticket' ? 'Ticket' : null,
      expiresAt: expiresAt || null
    };
    if (targetType === 'event' || targetType === 'ticket') {
      linkData.targetId = targetId;
    } else {
      linkData.customUrl = customUrl;
    }
    const shortLink = await shortLinkService.createShortLink(linkData, req.userId);
    const shortUrl = `${process.env.API_URL || req.protocol + ':'}${shortLink.code}`;
    res.status(201).json({
      message: 'Shortlink berhasil dibuat',
      shortLink: {
        code: shortLink.code,
        shortUrl,
        targetType: shortLink.targetType,
        targetId: shortLink.targetId,
        customUrl: shortLink.customUrl,
        visits: shortLink.visits,
        isActive: shortLink.isActive,
        expiresAt: shortLink.expiresAt,
        createdAt: shortLink.createdAt
      }
    });
  } catch (error) {
    logger.error(`Error saat membuat shortlink: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat membuat shortlink',
      error: error.message
    });
  }
};

const getUserShortLinks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const shortLinks = await ShortLink.find({
      createdBy: req.userId
    })
      .sort({
        createdAt: -1
      })
      .skip(skip)
      .limit(limit)
      .populate('targetId', 'title name');
    const totalLinks = await ShortLink.countDocuments({
      createdBy: req.userId
    });
    const formattedLinks = shortLinks.map(link => {
      const shortUrl = `${process.env.API_URL || req.protocol + ':'}${link.code}`;
      return {
        code: link.code,
        shortUrl,
        targetType: link.targetType,
        targetId: link.targetId,
        targetName: link.targetId ? link.targetId.title || link.targetId.name : null,
        customUrl: link.customUrl,
        visits: link.visits,
        isActive: link.isActive,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt
      };
    });
    res.status(200).json({
      shortLinks: formattedLinks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLinks / limit),
        totalItems: totalLinks,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error(`Error saat mengambil daftar shortlink: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat mengambil daftar shortlink',
      error: error.message
    });
  }
};

const updateShortLink = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { code } = req.params;
    const { isActive, expiresAt, customUrl } = req.body;
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt || null;
    if (customUrl !== undefined) updateData.customUrl = customUrl;
    const updatedShortLink = await shortLinkService.updateShortLink(code, updateData, req.userId);
    if (!updatedShortLink) {
      return res.status(404).json({
        message: 'Shortlink tidak ditemukan atau Anda tidak memiliki izin'
      });
    }
    const shortUrl = `${process.env.API_URL || req.protocol + ':'}${updatedShortLink.code}`;
    res.status(200).json({
      message: 'Shortlink berhasil diupdate',
      shortLink: {
        code: updatedShortLink.code,
        shortUrl,
        targetType: updatedShortLink.targetType,
        targetId: updatedShortLink.targetId,
        customUrl: updatedShortLink.customUrl,
        visits: updatedShortLink.visits,
        isActive: updatedShortLink.isActive,
        expiresAt: updatedShortLink.expiresAt,
        updatedAt: updatedShortLink.updatedAt
      }
    });
  } catch (error) {
    logger.error(`Error saat mengupdate shortlink: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat mengupdate shortlink',
      error: error.message
    });
  }
};

const deleteShortLink = async (req, res) => {
  try {
    const { code } = req.params;
    const success = await shortLinkService.deleteShortLink(code, req.userId);
    if (!success) {
      return res.status(404).json({
        message: 'Shortlink tidak ditemukan atau Anda tidak memiliki izin'
      });
    }
    res.status(200).json({
      message: 'Shortlink berhasil dihapus'
    });
  } catch (error) {
    logger.error(`Error saat menghapus shortlink: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat menghapus shortlink',
      error: error.message
    });
  }
};

const getShortLinkStats = async (req, res) => {
  try {
    const totalCount = await ShortLink.countDocuments();
    const topLinks = await ShortLink.find()
      .sort({
        visits: -1
      })
      .limit(5)
      .populate('createdBy', 'name email')
      .populate('targetId', 'title name');
    const latestLinks = await ShortLink.find()
      .sort({
        createdAt: -1
      })
      .limit(5)
      .populate('createdBy', 'name email')
      .populate('targetId', 'title name');
    const formatLink = link => {
      const shortUrl = `${process.env.API_URL || req.protocol + ':'}${link.code}`;
      return {
        code: link.code,
        shortUrl,
        targetType: link.targetType,
        targetName: link.targetId
          ? link.targetId.title || link.targetId.name
          : link.customUrl || 'External Link',
        visits: link.visits,
        creator: link.createdBy ? `${link.createdBy.name} (${link.createdBy.email})` : 'Unknown',
        createdAt: link.createdAt
      };
    };
    res.status(200).json({
      totalLinks: totalCount,
      topLinks: topLinks.map(formatLink),
      latestLinks: latestLinks.map(formatLink)
    });
  } catch (error) {
    logger.error(`Error saat mengambil statistik shortlink: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat mengambil statistik',
      error: error.message
    });
  }
};

/**
 * @desc    Mendapatkan semua shortlink yang dibuat oleh user
 * @route   GET /api/shortlinks/my-links
 * @access  Private
 */
const getMyShortLinks = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const shortLinks = await ShortLink.find({ createdBy: creatorId })
      .populate('targetId')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      shortLinks
    });
  } catch (error) {
    logger.error('Error saat mengambil shortlinks', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil shortlinks',
      error: error.message
    });
  }
};

module.exports = {
  redirectShortLink,
  getShortLinkInfo,
  createNewShortLink,
  getUserShortLinks,
  updateShortLink,
  deleteShortLink,
  getShortLinkStats,
  getMyShortLinks
};
