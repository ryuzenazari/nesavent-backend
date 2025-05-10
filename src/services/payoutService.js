const Payout = require('../models/Payout');
const Event = require('../models/Event');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');

const calculatePendingPayout = async (creatorId) => {
  try {
    const lastPayout = await Payout.findOne({ 
      creatorId, 
      status: { $in: ['completed', 'processing'] } 
    }).sort({ 'payoutEventsPeriod.endDate': -1 });
    
    const startDate = lastPayout ? lastPayout.payoutEventsPeriod.endDate : new Date(0);
    const endDate = new Date();
    
    const events = await Event.find({ 
      creatorId,
      eventDate: { $gte: startDate, $lte: endDate }
    });
    
    const eventIds = events.map(event => event._id);
    
    const transactionsData = await Transaction.aggregate([
      { $match: { 
        eventId: { $in: eventIds },
        status: 'success',
        createdAt: { $gte: startDate, $lte: endDate }
      }},
      { $group: {
        _id: '$eventId',
        ticketsSold: { $sum: 1 },
        revenue: { $sum: '$amount' }
      }},
      { $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: '_id',
        as: 'eventDetails'
      }},
      { $unwind: '$eventDetails' },
      { $project: {
        eventId: '$_id',
        eventTitle: '$eventDetails.title',
        ticketsSold: 1,
        revenue: 1
      }}
    ]);
    
    const platformFeePercentage = 5;
    const platformFeeFixed = 1000;
    
    const eventsData = transactionsData.map(event => {
      const eventFee = (event.revenue * platformFeePercentage / 100) + platformFeeFixed;
      return {
        eventId: event.eventId,
        eventTitle: event.eventTitle,
        ticketsSold: event.ticketsSold,
        revenue: event.revenue,
        platformFee: eventFee,
        netAmount: event.revenue - eventFee
      };
    });
    
    const totalRevenue = eventsData.reduce((sum, event) => sum + event.revenue, 0);
    const totalFee = eventsData.reduce((sum, event) => sum + event.platformFee, 0);
    const totalNetAmount = totalRevenue - totalFee;
    
    return {
      creatorId,
      payoutEventsPeriod: { startDate, endDate },
      events: eventsData,
      platformFee: {
        percentage: platformFeePercentage,
        fixedAmount: platformFeeFixed,
        total: totalFee
      },
      amount: totalNetAmount,
      currency: 'IDR'
    };
  } catch (error) {
    throw new Error(`Failed to calculate pending payout: ${error.message}`);
  }
};

const createPayout = async (creatorData) => {
  try {
    const { 
      creatorId, 
      paymentMethod, 
      bankDetails, 
      eWalletDetails, 
      paypalDetails, 
      otherPaymentDetails
    } = creatorData;
    
    const payoutData = await calculatePendingPayout(creatorId);
    
    if (payoutData.amount <= 0) {
      throw new Error('No funds available for payout');
    }
    
    const payout = new Payout({
      ...payoutData,
      paymentMethod,
      bankDetails,
      eWalletDetails,
      paypalDetails,
      otherPaymentDetails,
      status: 'pending',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
    
    await payout.save();
    return payout;
  } catch (error) {
    throw new Error(`Failed to create payout: ${error.message}`);
  }
};

const getPayouts = async (creatorId, status) => {
  try {
    const query = { creatorId };
    
    if (status) {
      query.status = status;
    }
    
    const payouts = await Payout.find(query)
      .sort({ createdAt: -1 });
      
    return payouts;
  } catch (error) {
    throw new Error(`Failed to get payouts: ${error.message}`);
  }
};

const getPayoutById = async (creatorId, payoutId) => {
  try {
    const payout = await Payout.findOne({ _id: payoutId, creatorId });
    
    if (!payout) {
      throw new Error('Payout not found or not owned by this creator');
    }
    
    return payout;
  } catch (error) {
    throw new Error(`Failed to get payout: ${error.message}`);
  }
};

const updatePayoutStatus = async (payoutId, status, adminId, notes) => {
  try {
    const payout = await Payout.findById(payoutId);
    
    if (!payout) {
      throw new Error('Payout not found');
    }
    
    if (payout.status === 'completed') {
      throw new Error('Cannot update a completed payout');
    }
    
    payout.status = status;
    payout.adminNotes = notes || payout.adminNotes;
    payout.processedBy = adminId;
    
    if (status === 'processing') {
      payout.processedAt = new Date();
    } else if (status === 'completed') {
      payout.completedAt = new Date();
    } else if (status === 'failed') {
      payout.failureReason = notes;
    }
    
    await payout.save();
    return payout;
  } catch (error) {
    throw new Error(`Failed to update payout status: ${error.message}`);
  }
};

const cancelPayout = async (creatorId, payoutId, reason) => {
  try {
    const payout = await Payout.findOne({ _id: payoutId, creatorId, status: 'pending' });
    
    if (!payout) {
      throw new Error('Payout not found, not owned by this creator, or not in pending status');
    }
    
    payout.status = 'cancelled';
    payout.notes = reason || 'Cancelled by creator';
    
    await payout.save();
    return payout;
  } catch (error) {
    throw new Error(`Failed to cancel payout: ${error.message}`);
  }
};

const getPayoutSummary = async (creatorId) => {
  try {
    const pendingAmount = await calculatePendingPayout(creatorId).then(data => data.amount);
    
    const payoutsData = await Payout.aggregate([
      { $match: { creatorId: mongoose.Types.ObjectId(creatorId) } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }}
    ]);
    
    const statusMap = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };
    
    payoutsData.forEach(item => {
      statusMap[item._id] = item.amount;
    });
    
    return {
      pendingAmount,
      processingAmount: statusMap.processing,
      completedAmount: statusMap.completed,
      failedAmount: statusMap.failed,
      cancelledAmount: statusMap.cancelled,
      totalPaidOut: statusMap.completed
    };
  } catch (error) {
    throw new Error(`Failed to get payout summary: ${error.message}`);
  }
};

module.exports = {
  calculatePendingPayout,
  createPayout,
  getPayouts,
  getPayoutById,
  updatePayoutStatus,
  cancelPayout,
  getPayoutSummary
}; 