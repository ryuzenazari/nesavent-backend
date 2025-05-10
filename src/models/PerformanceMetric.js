const mongoose = require('mongoose');

const performanceMetricSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    memory: {
      rss: Number,
      heapTotal: Number,
      heapUsed: Number,
      external: Number,
      arrayBuffers: Number
    },
    cpu: {
      user: Number,
      system: Number
    },
    loadAvg: [Number]
  }
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'name',
    granularity: 'seconds'
  }
});

performanceMetricSchema.index({ name: 1, timestamp: -1 });

performanceMetricSchema.statics.getAverageByPeriod = async function(name, period = 'hour') {
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'minute':
      startDate.setMinutes(now.getMinutes() - 1);
      break;
    case 'hour':
      startDate.setHours(now.getHours() - 1);
      break;
    case 'day':
      startDate.setDate(now.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    default:
      startDate.setHours(now.getHours() - 1);
  }
  
  const result = await this.aggregate([
    {
      $match: {
        name,
        timestamp: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: null,
        avgValue: { $avg: '$value' },
        minValue: { $min: '$value' },
        maxValue: { $max: '$value' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { avgValue: 0, minValue: 0, maxValue: 0, count: 0 };
};

const PerformanceMetric = mongoose.model('PerformanceMetric', performanceMetricSchema);

module.exports = PerformanceMetric; 