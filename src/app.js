const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const passport = require('./config/passport');
const { generalLimiter } = require('./middleware/rateLimiter');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const staffRoutes = require('./routes/staffRoutes');
const shortLinkRoutes = require('./routes/shortLinkRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const studentVerificationRoutes = require('./routes/studentVerificationRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const socialShareRoutes = require('./routes/socialShareRoutes');
const creatorFollowRoutes = require('./routes/creatorFollowRoutes');
const abuseReportRoutes = require('./routes/abuseReportRoutes');
const compression = require('compression');
const { createIndexes } = require('./models/indexes');
const { rateLimiters } = require('./middleware/rateLimiter');
const monitoringRoutes = require('./routes/monitoringRoutes');
const { measureMiddleware } = require('./services/performanceMonitoringService');
const errorTracker = require('./services/errorTrackingService');
const app = express();
const PORT = process.env.PORT || 5000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(passport.initialize());
app.use(loggerMiddleware);
app.use(compression());
app.use(measureMiddleware);
const eventUploadDir = path.join(__dirname, '../uploads/events');
const profileUploadDir = path.join(__dirname, '../uploads/profiles');
const documentUploadDir = path.join(__dirname, '../uploads/documents');
const ktmUploadDir = path.join(__dirname, '../uploads/documents/ktm');
if (!fs.existsSync(eventUploadDir)) {
  fs.mkdirSync(eventUploadDir, {
    recursive: true
  });
  logger.info('Direktori uploads/events dibuat');
}
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, {
    recursive: true
  });
  logger.info('Direktori uploads/profiles dibuat');
}
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, {
    recursive: true
  });
  logger.info('Direktori uploads/documents dibuat');
}
if (!fs.existsSync(ktmUploadDir)) {
  fs.mkdirSync(ktmUploadDir, {
    recursive: true
  });
  logger.info('Direktori uploads/documents/ktm dibuat');
}
app.use('/uploads/events', express.static(path.join(__dirname, '../uploads/events')));
app.use('/uploads/profiles', express.static(path.join(__dirname, '../uploads/profiles')));
app.use('/uploads/documents', express.static(path.join(__dirname, '../uploads/documents')));
app.use(generalLimiter);
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.register);
app.use('/api/events', rateLimiters.events);
app.use('/api/tickets', rateLimiters.tickets);
app.use('/api/payment', rateLimiters.payments);
app.use('/api/auth/profile', rateLimiters.profile);
app.use(['/api/events/upload', '/api/auth/profile/image'], rateLimiters.uploads);
app.get('/', (req, res) => {
  res.json({
    message: 'Selamat datang di API NesaVent',
    version: '1.0.0',
    description: 'Platform ticketing event yang dibuat oleh mahasiswa untuk komunitas kampus',
    disclaimer:
      'NesaVent adalah platform independen dan tidak terafiliasi secara resmi dengan Universitas Negeri Surabaya (UNESA)'
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/shortlinks', shortLinkRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/student-verification', studentVerificationRoutes);
app.use('/api', ratingRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', socialShareRoutes);
app.use('/api', creatorFollowRoutes);
app.use('/api/reports', abuseReportRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/s', shortLinkRoutes);
app.use((req, res, next) => {
  const error = new Error('Tidak ditemukan');
  error.status = 404;
  logger.warn(`Route tidak ditemukan: ${req.method} ${req.originalUrl}`);
  next(error);
});
app.use((error, req, res, next) => {
  errorTracker.trackError(error, { req });
  
  logger.error('Kesalahan server', {
    error: error.message,
    stack: error.stack
  });
  
  res.status(error.status || 500);
  res.json({
    success: false,
    message: error.message || 'Terjadi kesalahan pada server'
  });
});
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Create database indexes
  await createIndexes();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
module.exports = app;
