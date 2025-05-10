const socialShareService = require('../services/socialShareService');

const createShareWithShortLink = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { shareType } = req.body;
    
    if (!shareType) {
      return res.status(400).json({
        success: false,
        message: 'Share type diperlukan'
      });
    }
    
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      device: req.body.device,
      browser: req.body.browser,
      os: req.body.os
    };
    
    const result = await socialShareService.createShareWithShortLink(userId, eventId, shareType, metadata);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const trackShareClick = async (req, res) => {
  try {
    const { referralCode } = req.params;
    
    const share = await socialShareService.trackShareClick(referralCode);
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Referral code tidak valid'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        event: share.event
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getUserShares = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, eventId } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      eventId
    };
    
    const shares = await socialShareService.getUserShares(userId, options);
    
    res.status(200).json({
      success: true,
      data: shares
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getEventShares = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page, limit, shareType } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      shareType
    };
    
    const shares = await socialShareService.getEventShares(eventId, options);
    
    res.status(200).json({
      success: true,
      data: shares
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getShareStatistics = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const stats = await socialShareService.getShareStatistics(eventId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getSharingLinks = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    const sharingLinks = await socialShareService.getSharingLinks(eventId, userId);
    
    res.status(200).json({
      success: true,
      data: sharingLinks
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createShareWithShortLink,
  trackShareClick,
  getUserShares,
  getEventShares,
  getShareStatistics,
  getSharingLinks
}; 