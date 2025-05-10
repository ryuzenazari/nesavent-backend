const mongoose = require('mongoose');
const os = require('os');
const logger = require('../utils/logger');
const { perfMetrics } = require('../services/performanceMonitoringService');
const errorTracker = require('../services/errorTrackingService');
const dbHealthService = require('../services/dbHealthService');
const notificationService = require('../services/notificationService');

const healthCheck = async (req, res) => {
  try {
    const status = {
      service: 'NesaVent API',
      timestamp: new Date(),
      uptime: process.uptime(),
      status: 'OK',
      database: 'CHECKING'
    };

    const dbStatus = await dbHealthService.checkConnection();
    status.database = dbStatus.connected ? 'OK' : 'ERROR';
    
    if (!dbStatus.connected) {
      status.status = 'WARNING';
      status.databaseError = dbStatus.error;
    }

    const statusCode = status.status === 'OK' ? 200 : 
                       status.status === 'WARNING' ? 200 : 503;
    
    return res.status(statusCode).json(status);
  } catch (error) {
    return res.status(500).json({
      service: 'NesaVent API',
      timestamp: new Date(),
      status: 'ERROR',
      error: error.message
    });
  }
};

const getMetrics = async (req, res) => {
  try {
    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        osUptime: os.uptime(),
        freeMem: os.freemem(),
        totalMem: os.totalmem(),
        loadAvg: os.loadavg()
      },
      database: {
        connections: mongoose.connections.map(conn => ({
          name: conn.name,
          host: conn.host,
          readyState: conn.readyState,
          collections: Object.keys(conn.collections).length
        }))
      },
      performance: perfMetrics.getAll(),
      errors: errorTracker.getSummary()
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getErrors = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const parsedLimit = parseInt(limit) || 100;
    const errors = await errorTracker.getErrors({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parsedLimit
    });
    
    res.json({
      count: errors.length,
      errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    const { metric, period } = req.query;
    
    if (metric) {
      const metricData = await perfMetrics.getMetric(metric, period);
      return res.json({ metric, data: metricData });
    }
    
    const metrics = await perfMetrics.getAllDetailed(period);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const { level, startDate, endDate, limit } = req.query;
    const parsedLimit = parseInt(limit) || 100;
    
    const logs = await logger.queryLogs({
      level,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parsedLimit
    });
    
    res.json({
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSystemInfo = async (req, res) => {
  try {
    const info = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpus: os.cpus(),
      networkInterfaces: os.networkInterfaces(),
      hostname: os.hostname(),
      env: process.env.NODE_ENV || 'development'
    };
    
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const testAlerts = async (req, res) => {
  try {
    const { type, message } = req.body;
    
    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message are required' });
    }
    
    await notificationService.sendAlert({
      type,
      message,
      source: 'Manual Test',
      timestamp: new Date(),
      metadata: { triggeredBy: req.user.id }
    });
    
    res.json({ success: true, message: 'Alert sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  healthCheck,
  getMetrics,
  getErrors,
  getPerformanceMetrics,
  getLogs,
  getSystemInfo,
  testAlerts
}; 