const PromoCode = require('../models/PromoCode');
const logger = require('../utils/logger');

/**
 * Membuat kode promo baru
 */
const createPromoCode = async (promoData) => {
  try {
    // Periksa apakah kode promo sudah ada
    const existingCode = await PromoCode.findOne({ code: promoData.code });
    if (existingCode) {
      throw new Error('Kode promo sudah digunakan');
    }
    
    const promoCode = new PromoCode(promoData);
    await promoCode.save();
    return promoCode;
  } catch (error) {
    logger.error('Error creating promo code:', error);
    throw error;
  }
};

/**
 * Mendapatkan semua kode promo
 */
const getPromoCodes = async (filter = {}, options = {}) => {
  try {
    const promoCodes = await PromoCode.find(filter)
      .populate('createdBy', 'name email')
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return promoCodes;
  } catch (error) {
    logger.error('Error getting promo codes:', error);
    throw error;
  }
};

/**
 * Mendapatkan kode promo berdasarkan ID
 */
const getPromoCodeById = async (promoId) => {
  try {
    const promoCode = await PromoCode.findById(promoId).populate('createdBy', 'name email');
    
    if (!promoCode) {
      throw new Error('Promo code not found');
    }
    
    return promoCode;
  } catch (error) {
    logger.error(`Error getting promo code by ID ${promoId}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan kode promo berdasarkan kode
 */
const getPromoCodeByCode = async (code) => {
  try {
    const promoCode = await PromoCode.findOne({ code, isActive: true });
    
    if (!promoCode) {
      throw new Error('Promo code not found or inactive');
    }
    
    // Validasi tanggal
    const now = new Date();
    if (promoCode.startDate > now || promoCode.endDate < now) {
      throw new Error('Promo code has expired or not yet active');
    }
    
    // Validasi penggunaan maksimum
    if (promoCode.maxUses > 0 && promoCode.usedCount >= promoCode.maxUses) {
      throw new Error('Promo code has reached maximum usage');
    }
    
    return promoCode;
  } catch (error) {
    logger.error(`Error getting promo code by code ${code}:`, error);
    throw error;
  }
};

/**
 * Memperbarui kode promo
 */
const updatePromoCode = async (promoId, updateData) => {
  try {
    // Jika kode diperbarui, cek apakah sudah ada
    if (updateData.code) {
      const existingCode = await PromoCode.findOne({ 
        code: updateData.code,
        _id: { $ne: promoId }
      });
      
      if (existingCode) {
        throw new Error('Kode promo sudah digunakan');
      }
    }
    
    const promoCode = await PromoCode.findByIdAndUpdate(
      promoId,
      updateData,
      { new: true }
    );
    
    if (!promoCode) {
      throw new Error('Promo code not found');
    }
    
    return promoCode;
  } catch (error) {
    logger.error(`Error updating promo code ${promoId}:`, error);
    throw error;
  }
};

/**
 * Menghapus kode promo
 */
const deletePromoCode = async (promoId) => {
  try {
    const result = await PromoCode.findByIdAndDelete(promoId);
    if (!result) {
      throw new Error('Promo code not found');
    }
    return result;
  } catch (error) {
    logger.error(`Error deleting promo code ${promoId}:`, error);
    throw error;
  }
};

/**
 * Mengaktifkan/menonaktifkan kode promo
 */
const togglePromoCodeStatus = async (promoId, isActive) => {
  try {
    const promoCode = await PromoCode.findByIdAndUpdate(
      promoId,
      { isActive },
      { new: true }
    );
    
    if (!promoCode) {
      throw new Error('Promo code not found');
    }
    
    return promoCode;
  } catch (error) {
    logger.error(`Error toggling promo code status for ${promoId}:`, error);
    throw error;
  }
};

/**
 * Mencatat penggunaan kode promo
 */
const recordPromoCodeUsage = async (code, userId) => {
  try {
    const promoCode = await PromoCode.findOne({ code });
    
    if (!promoCode) {
      throw new Error('Promo code not found');
    }
    
    promoCode.usedCount += 1;
    promoCode.usedBy.push({
      userId,
      usedAt: new Date()
    });
    
    await promoCode.save();
    return promoCode;
  } catch (error) {
    logger.error(`Error recording usage for promo code ${code}:`, error);
    throw error;
  }
};

module.exports = {
  createPromoCode,
  getPromoCodes,
  getPromoCodeById,
  getPromoCodeByCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  recordPromoCodeUsage
}; 