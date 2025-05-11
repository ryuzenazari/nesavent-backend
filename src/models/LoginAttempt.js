const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 3600 // otomatis hapus dokumen setelah 1 jam
  },
  success: {
    type: Boolean,
    default: false
  }
});

// Metode statis untuk menghitung jumlah percobaan login gagal dalam waktu tertentu
loginAttemptSchema.statics.countRecentFailures = async function(email, ipAddress, timeWindow) {
  const since = new Date();
  since.setTime(since.getTime() - timeWindow);
  
  return this.countDocuments({
    email,
    ipAddress,
    timestamp: { $gte: since },
    success: false
  });
};

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

module.exports = LoginAttempt; 