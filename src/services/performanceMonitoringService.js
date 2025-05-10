const os = require('os');
const { PerformanceObserver, performance } = require('perf_hooks');
const PerformanceMetric = require('../models/PerformanceMetric');

const METRICS_HISTORY_LENGTH = 1000;
const metricsHistory = new Map();

const initPerformanceMonitoring = () => {
  const obs = new PerformanceObserver((items) => {
    for (const entry of items.getEntries()) {
      recordMetric(entry.name, entry.duration);
    }
    performance.clearMarks();
  });
  
  obs.observe({ entryTypes: ['measure'], buffered: true });
};

const startMeasure = (name) => {
  const markName = `${name}_start`;
  performance.mark(markName);
  return markName;
};

const endMeasure = (name, startMarkName) => {
  const endMarkName = `${name}_end`;
  performance.mark(endMarkName);
  performance.measure(name, startMarkName, endMarkName);
};

const recordMetric = (name, value) => {
  if (!metricsHistory.has(name)) {
    metricsHistory.set(name, []);
  }
  
  const metrics = metricsHistory.get(name);
  metrics.push({
    timestamp: new Date(),
    value
  });
  
  if (metrics.length > METRICS_HISTORY_LENGTH) {
    metrics.shift();
  }
  
  saveMetricToDB(name, value).catch(err => {
    console.error(`Failed to save performance metric to DB: ${err.message}`);
  });
};

const saveMetricToDB = async (name, value) => {
  const metric = new PerformanceMetric({
    name,
    value,
    timestamp: new Date(),
    metadata: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      loadAvg: os.loadavg()
    }
  });
  
  await metric.save();
};

const measureMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const url = req.originalUrl;
  const method = req.method;
  
  const metricName = `request_${method}_${url.split('?')[0].replace(/\//g, '_')}`;
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordMetric(metricName, duration);
    recordMetric('request_total', duration);
    
    if (res.statusCode >= 400) {
      recordMetric(`error_${res.statusCode}`, 1);
    }
  });
  
  next();
};

const measureDbOperation = async (operation, collection, query, callback) => {
  const startMarkName = startMeasure(`db_${operation}_${collection}`);
  
  try {
    const result = await callback();
    endMeasure(`db_${operation}_${collection}`, startMarkName);
    return result;
  } catch (error) {
    endMeasure(`db_${operation}_${collection}`, startMarkName);
    throw error;
  }
};

const getMetric = async (name, period) => {
  const query = { name };
  
  if (period) {
    const since = new Date();
    since.setMinutes(since.getMinutes() - parseInt(period));
    query.timestamp = { $gte: since };
  }
  
  return await PerformanceMetric.find(query)
    .sort({ timestamp: 1 })
    .limit(1000);
};

const getAllMetrics = async (period) => {
  const query = {};
  
  if (period) {
    const since = new Date();
    since.setMinutes(since.getMinutes() - parseInt(period));
    query.timestamp = { $gte: since };
  }
  
  const metrics = await PerformanceMetric.aggregate([
    { $match: query },
    { $group: {
      _id: '$name',
      avg: { $avg: '$value' },
      min: { $min: '$value' },
      max: { $max: '$value' },
      count: { $sum: 1 },
      last: { $last: '$value' },
      lastTimestamp: { $last: '$timestamp' }
    }},
    { $sort: { _id: 1 } }
  ]);
  
  return metrics;
};

const getAll = () => {
  const result = {};
  
  for (const [name, values] of metricsHistory.entries()) {
    if (values.length === 0) continue;
    
    const valuesOnly = values.map(v => v.value);
    result[name] = {
      avg: valuesOnly.reduce((a, b) => a + b, 0) / valuesOnly.length,
      min: Math.min(...valuesOnly),
      max: Math.max(...valuesOnly),
      count: valuesOnly.length,
      last: valuesOnly[valuesOnly.length - 1]
    };
  }
  
  return result;
};

const getAllDetailed = async (period) => {
  return await getAllMetrics(period);
};

initPerformanceMonitoring();

module.exports = {
  perfMetrics: {
    startMeasure,
    endMeasure,
    recordMetric,
    getMetric,
    getAll,
    getAllDetailed
  },
  measureMiddleware,
  measureDbOperation
}; 