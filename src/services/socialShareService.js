const SocialShare = require('../models/SocialShare');
const ShortLink = require('../models/ShortLink');
const Event = require('../models/Event');
const crypto = require('crypto');

const createSocialShare = async (userId, eventId, shareType, metadata = {}) => {
  const referralCode = generateReferralCode(userId);
  
  const socialShare = new SocialShare({
    event: eventId,
    user: userId,
    shareType,
    referralCode,
    metadata
  });
  
  await socialShare.save();
  
  return socialShare;
};

const createShareWithShortLink = async (userId, eventId, shareType, metadata = {}) => {
  const referralCode = generateReferralCode(userId);
  
  const event = await Event.findById(eventId).select('title slug');
  
  if (!event) {
    throw new Error('Event tidak ditemukan');
  }
  
  const code = crypto.randomBytes(4).toString('hex');
  
  const shortLink = new ShortLink({
    originalUrl: `/events/${event.slug}?ref=${referralCode}`,
    code,
    type: 'event',
    referenceId: eventId,
    createdBy: userId,
    expiresAt: null,
    metadata: {
      title: event.title,
      eventId,
      referralCode,
      shareType
    }
  });
  
  await shortLink.save();
  
  const socialShare = new SocialShare({
    event: eventId,
    user: userId,
    shareType,
    referralCode,
    shortLinkId: shortLink._id,
    metadata
  });
  
  await socialShare.save();
  
  return {
    socialShare,
    shortLink: {
      code,
      url: `/s/${code}`
    }
  };
};

const trackShareClick = async (referralCode) => {
  const share = await SocialShare.findOne({ referralCode });
  
  if (!share) {
    return null;
  }
  
  share.clicks += 1;
  await share.save();
  
  return share;
};

const trackTicketPurchase = async (referralCode, quantity, amount) => {
  const share = await SocialShare.findOne({ referralCode });
  
  if (!share) {
    return null;
  }
  
  share.ticketsPurchased += quantity;
  share.totalRevenue += amount;
  await share.save();
  
  return share;
};

const getUserShares = async (userId, options = {}) => {
  const { page = 1, limit = 10, eventId } = options;
  
  const query = { user: userId };
  
  if (eventId) {
    query.event = eventId;
  }
  
  const total = await SocialShare.countDocuments(query);
  
  const shares = await SocialShare.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('event', 'title image startDate')
    .lean();
  
  return {
    shares,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalShares: total
    }
  };
};

const getEventShares = async (eventId, options = {}) => {
  const { page = 1, limit = 10, shareType } = options;
  
  const query = { event: eventId };
  
  if (shareType) {
    query.shareType = shareType;
  }
  
  const total = await SocialShare.countDocuments(query);
  
  const shares = await SocialShare.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'name profileImage')
    .lean();
  
  return {
    shares,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalShares: total
    }
  };
};

const getShareStatistics = async (eventId) => {
  const stats = await SocialShare.aggregate([
    { $match: { event: eventId ? eventId : { $exists: true } } },
    { $group: {
        _id: '$shareType',
        count: { $sum: 1 },
        clicks: { $sum: '$clicks' },
        tickets: { $sum: '$ticketsPurchased' },
        revenue: { $sum: '$totalRevenue' }
      }
    },
    { $project: {
        _id: 0,
        shareType: '$_id',
        count: 1,
        clicks: 1,
        tickets: 1,
        revenue: 1,
        ctr: {
          $cond: [
            { $eq: ['$count', 0] },
            0,
            { $multiply: [{ $divide: ['$clicks', '$count'] }, 100] }
          ]
        },
        conversionRate: {
          $cond: [
            { $eq: ['$clicks', 0] },
            0,
            { $multiply: [{ $divide: ['$tickets', '$clicks'] }, 100] }
          ]
        }
      }
    }
  ]);
  
  const totalStats = await SocialShare.aggregate([
    { $match: { event: eventId ? eventId : { $exists: true } } },
    { $group: {
        _id: null,
        totalShares: { $sum: 1 },
        totalClicks: { $sum: '$clicks' },
        totalTickets: { $sum: '$ticketsPurchased' },
        totalRevenue: { $sum: '$totalRevenue' }
      }
    }
  ]);
  
  return {
    byShareType: stats,
    total: totalStats.length > 0 ? totalStats[0] : {
      totalShares: 0,
      totalClicks: 0,
      totalTickets: 0,
      totalRevenue: 0
    }
  };
};

const generateReferralCode = (userId) => {
  const timestamp = Date.now().toString();
  const randomString = crypto.randomBytes(4).toString('hex');
  return `${userId.toString().substr(-4)}-${randomString}-${timestamp.substr(-4)}`;
};

const getSharingLinks = async (eventId, userId) => {
  const event = await Event.findById(eventId).select('title slug');
  
  if (!event) {
    throw new Error('Event tidak ditemukan');
  }
  
  const referralCode = generateReferralCode(userId);
  
  const shortLink = new ShortLink({
    originalUrl: `/events/${event.slug}?ref=${referralCode}`,
    code: crypto.randomBytes(4).toString('hex'),
    type: 'event',
    referenceId: eventId,
    createdBy: userId,
    expiresAt: null,
    metadata: {
      title: event.title,
      eventId,
      referralCode,
      shareType: 'generated'
    }
  });
  
  await shortLink.save();
  
  const baseUrl = process.env.FRONTEND_URL || 'https://nesavent.herokuapp.com';
  const eventUrl = `${baseUrl}/events/${event.slug}?ref=${referralCode}`;
  const shortUrl = `${baseUrl}/s/${shortLink.code}`;
  
  const shareLinks = {
    eventUrl,
    shortUrl,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent(`Yuk ikut event ${event.title} di NesaVent!`)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Yuk ikut event ${event.title} di NesaVent! ${shortUrl}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent(`Yuk ikut event ${event.title} di NesaVent!`)}`,
    email: `mailto:?subject=${encodeURIComponent(`Event ${event.title} di NesaVent`)}&body=${encodeURIComponent(`Halo, yuk ikut event ${event.title} di NesaVent! Klik link berikut untuk info lebih lanjut: ${shortUrl}`)}`
  };
  
  return {
    event: {
      id: event._id,
      title: event.title,
      slug: event.slug
    },
    referralCode,
    shareLinks,
    shortLink: {
      code: shortLink.code,
      url: shortUrl
    }
  };
};

module.exports = {
  createSocialShare,
  createShareWithShortLink,
  trackShareClick,
  trackTicketPurchase,
  getUserShares,
  getEventShares,
  getShareStatistics,
  getSharingLinks
}; 