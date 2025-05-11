const Transaction = require('../models/Transaction');
const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');

/**
 * Mendapatkan semua transaksi
 */
const getAllTransactions = async (filter = {}, options = {}) => {
  try {
    const transactions = await Transaction.find(filter)
      .populate('user', 'name email')
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return transactions;
  } catch (error) {
    logger.error('Error getting all transactions:', error);
    throw error;
  }
};

/**
 * Mendapatkan transaksi berdasarkan ID
 */
const getTransactionById = async (transactionId) => {
  try {
    const transaction = await Transaction.findById(transactionId)
      .populate('user', 'name email')
      .populate({
        path: 'tickets',
        populate: {
          path: 'event',
          select: 'title date time location'
        }
      });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    return transaction;
  } catch (error) {
    logger.error(`Error getting transaction by ID ${transactionId}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan transaksi berdasarkan filter pengguna
 */
const getUserTransactions = async (userId, filter = {}, options = {}) => {
  try {
    const userFilter = { ...filter, user: userId };
    
    const transactions = await Transaction.find(userFilter)
      .populate({
        path: 'tickets',
        populate: {
          path: 'event',
          select: 'title date time location'
        }
      })
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return transactions;
  } catch (error) {
    logger.error(`Error getting transactions for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Menghitung total pendapatan (revenue)
 */
const calculateRevenue = async (filter = {}) => {
  try {
    const result = await Transaction.aggregate([
      { $match: { ...filter, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    logger.error('Error calculating revenue:', error);
    throw error;
  }
};

/**
 * Mendapatkan statistik pembelian tiket
 */
const getTicketSalesStats = async (filter = {}) => {
  try {
    const transactions = await Transaction.find({ 
      ...filter, 
      paymentStatus: 'completed' 
    });
    
    const totalSales = transactions.length;
    const totalRevenue = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Total tiket terjual
    const ticketIds = transactions.flatMap(transaction => transaction.tickets);
    const ticketCount = ticketIds.length;
    
    // Rata-rata harga tiket
    const averageTicketPrice = ticketCount > 0 ? totalRevenue / ticketCount : 0;
    
    return {
      totalSales,
      totalRevenue,
      ticketCount,
      averageTicketPrice
    };
  } catch (error) {
    logger.error('Error getting ticket sales stats:', error);
    throw error;
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  getUserTransactions,
  calculateRevenue,
  getTicketSalesStats
}; 