const ErrorLog = require('../models/ErrorLog');
const mongoose = require('mongoose');
const notificationService = require('./notificationService');

const MAX_ERRORS_IN_MEMORY = 100;
const NOTIFICATION_THRESHOLD = 5;
const TIME_WINDOW_MS = 5 * 60 * 1000;

const recentErrors = [];
const errorCounts = new Map();
const errorNotified = new Set();

const trackError = async (error, metadata = {}) => {
  try {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        path: metadata.req?.path || metadata.path,
        method: metadata.req?.method || metadata.method,
        userId: metadata.userId || metadata.req?.user?.id,
        ip: metadata.req?.ip
      }
    };

    const errorId = `${errorData.message}-${errorData.metadata.path || ''}-${errorData.metadata.method || ''}`;
    
    updateErrorStats(errorId);
    
    if (recentErrors.length >= MAX_ERRORS_IN_MEMORY) {
      recentErrors.shift();
    }
    recentErrors.push(errorData);

    const errorLog = new ErrorLog(errorData);
    await errorLog.save();

    await checkErrorFrequency(errorId, errorData);
    
    return errorData;
  } catch (loggingError) {
    console.error('Error tracking service failed:', loggingError);
    return null;
  }
};

const updateErrorStats = (errorId) => {
  const currentCount = errorCounts.get(errorId) || { count: 0, firstSeen: new Date() };
  currentCount.count += 1;
  currentCount.lastSeen = new Date();
  errorCounts.set(errorId, currentCount);
};

const checkErrorFrequency = async (errorId, errorData) => {
  const errorInfo = errorCounts.get(errorId);
  
  if (!errorInfo) return;
  
  const { count, firstSeen, lastSeen } = errorInfo;
  
  const timeWindow = lastSeen.getTime() - firstSeen.getTime();
  const isFrequent = count >= NOTIFICATION_THRESHOLD && timeWindow <= TIME_WINDOW_MS;
  
  if (isFrequent && !errorNotified.has(errorId)) {
    errorNotified.add(errorId);
    
    await notificationService.sendAlert({
      type: 'error_frequency',
      message: `Error occurring frequently: ${errorData.message}`,
      source: 'ErrorTrackingService',
      metadata: {
        errorId,
        count,
        timeWindow: `${(timeWindow / 1000).toFixed(2)}s`,
        path: errorData.metadata.path
      }
    });

    setTimeout(() => {
      errorNotified.delete(errorId);
    }, TIME_WINDOW_MS);
  }
};

const getErrors = async (options = {}) => {
  const { startDate, endDate, limit = 100, skip = 0 } = options;
  
  const query = {};
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  const errors = await ErrorLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
  
  return errors;
};

const getSummary = () => {
  const summary = {
    total: recentErrors.length,
    topErrors: [],
    recentTimestamp: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1].timestamp : null
  };
  
  const topErrors = [...errorCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  
  summary.topErrors = topErrors.map(([id, stats]) => ({
    id,
    count: stats.count,
    firstSeen: stats.firstSeen,
    lastSeen: stats.lastSeen
  }));
  
  return summary;
};

const clearStats = () => {
  errorCounts.clear();
  errorNotified.clear();
  recentErrors.length = 0;
};

module.exports = {
  trackError,
  getErrors,
  getSummary,
  clearStats
}; 