const PromoCode = require('../models/PromoCode');
const mongoose = require('mongoose');

const createPromoCode = async (promoCodeData) => {
  try {
    const { code } = promoCodeData;
    
    const existingCode = await PromoCode.findOne({ code });
    if (existingCode) {
      throw new Error('Promo code already exists');
    }
    
    const promoCode = new PromoCode(promoCodeData);
    await promoCode.save();
    
    return promoCode;
  } catch (error) {
    throw new Error(`Failed to create promo code: ${error.message}`);
  }
};

const getPromoCodes = async (filters = {}, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const query = {};
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    if (filters.type) {
      query.type = filters.type;
    }
    
    if (filters.search) {
      query.code = { $regex: filters.search, $options: 'i' };
    }
    
    if (filters.valid) {
      const now = new Date();
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }
    
    if (filters.expired) {
      query.endDate = { $lt: new Date() };
    }
    
    const totalCount = await PromoCode.countDocuments(query);
    
    const promoCodes = await PromoCode.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    return {
      promoCodes,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get promo codes: ${error.message}`);
  }
};

const getPromoCodeById = async (promoCodeId) => {
  try {
    const promoCode = await PromoCode.findById(promoCodeId)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('applicableEvents', 'title eventDate')
      .populate('exclusions', 'title eventDate');
    
    if (!promoCode) {
      throw new Error('Promo code not found');
    }
    
    return promoCode;
  } catch (error) {
    throw new Error(`Failed to get promo code: ${error.message}`);
  }
};

const updatePromoCode = async (promoCodeId, updateData, adminId) => {
  try {
    const promoCode = await PromoCode.findById(promoCodeId);
    
    if (!promoCode) {
      throw new Error('Promo code not found');
    }
    
    if (updateData.code && updateData.code !== promoCode.code) {
      const existingCode = await PromoCode.findOne({ code: updateData.code });
      if (existingCode) {
        throw new Error('Promo code already exists');
      }
    }
    
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdBy' && key !== 'createdAt') {
        promoCode[key] = updateData[key];
      }
    });
    
    promoCode.updatedBy = adminId;
    
    await promoCode.save();
    return promoCode;
  } catch (error) {
    throw new Error(`Failed to update promo code: ${error.message}`);
  }
};

const deletePromoCode = async (promoCodeId) => {
  try {
    const result = await PromoCode.findByIdAndDelete(promoCodeId);
    
    if (!result) {
      throw new Error('Promo code not found');
    }
    
    return { success: true, message: 'Promo code deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete promo code: ${error.message}`);
  }
};

const togglePromoCodeStatus = async (promoCodeId, isActive, adminId) => {
  try {
    const promoCode = await PromoCode.findById(promoCodeId);
    
    if (!promoCode) {
      throw new Error('Promo code not found');
    }
    
    promoCode.isActive = isActive;
    promoCode.updatedBy = adminId;
    
    await promoCode.save();
    return promoCode;
  } catch (error) {
    throw new Error(`Failed to toggle promo code status: ${error.message}`);
  }
};

const validatePromoCode = async (code, userId, eventId, purchaseAmount) => {
  try {
    const result = await PromoCode.validatePromoCode(code, userId, eventId, purchaseAmount);
    return result;
  } catch (error) {
    throw new Error(`Promo code validation failed: ${error.message}`);
  }
};

const redeemPromoCode = async (code, userId, eventId, purchaseAmount) => {
  try {
    const result = await PromoCode.redeemPromoCode(code, userId, eventId, purchaseAmount);
    return result;
  } catch (error) {
    throw new Error(`Failed to redeem promo code: ${error.message}`);
  }
};

const getPromoCodeStats = async () => {
  try {
    const now = new Date();
    
    const stats = await PromoCode.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: "$type", count: { $sum: 1 } } }
          ],
          byStatus: [
            { 
              $group: { 
                _id: {
                  isActive: "$isActive",
                  isValid: {
                    $and: [
                      { $lte: ["$startDate", now] },
                      { $gte: ["$endDate", now] }
                    ]
                  }
                },
                count: { $sum: 1 }
              }
            }
          ],
          totalCodes: [
            { $count: "count" }
          ],
          totalActive: [
            { $match: { isActive: true } },
            { $count: "count" }
          ],
          totalUsed: [
            { $match: { usageCount: { $gt: 0 } } },
            { $count: "count" }
          ],
          totalUsage: [
            { $group: { _id: null, total: { $sum: "$usageCount" } } }
          ]
        }
      }
    ]);
    
    const formattedStats = {
      byType: {},
      byStatus: {},
      totalCodes: stats[0].totalCodes[0]?.count || 0,
      totalActive: stats[0].totalActive[0]?.count || 0,
      totalUsed: stats[0].totalUsed[0]?.count || 0,
      totalUsage: stats[0].totalUsage[0]?.total || 0
    };
    
    stats[0].byType.forEach(item => {
      formattedStats.byType[item._id] = item.count;
    });
    
    stats[0].byStatus.forEach(item => {
      const status = `${item._id.isActive ? 'active' : 'inactive'}_${item._id.isValid ? 'valid' : 'expired'}`;
      formattedStats.byStatus[status] = item.count;
    });
    
    return formattedStats;
  } catch (error) {
    throw new Error(`Failed to get promo code stats: ${error.message}`);
  }
};

module.exports = {
  createPromoCode,
  getPromoCodes,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  validatePromoCode,
  redeemPromoCode,
  getPromoCodeStats
}; 