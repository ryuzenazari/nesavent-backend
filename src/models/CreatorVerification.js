const mongoose = require('mongoose');

const creatorVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true
  },
  organizationType: {
    type: String,
    enum: [
      'himpunan', // Himpunan Mahasiswa
      'ukm', // Unit Kegiatan Mahasiswa
      'bem', // Badan Eksekutif Mahasiswa
      'fakultas', // Organisasi tingkat fakultas
      'jurusan', // Organisasi tingkat jurusan/prodi
      'komunitas', // Komunitas informal
      'kepanitiaan', // Kepanitiaan event
      'eksternal', // Organisasi non-kampus
      'startup', // Startup mahasiswa
      'paguyuban', // Paguyuban daerah/alumni
      'studyclub', // Kelompok studi
      'lainnya' // Lainnya
    ],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  documents: [
    {
      type: String,
      required: true
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  adminNotes: {
    type: String
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indeks untuk meningkatkan performa query
creatorVerificationSchema.index({ organizationType: 1 });
creatorVerificationSchema.index({ status: 1 });
creatorVerificationSchema.index({ status: 1, organizationType: 1 });  // Indeks kompositd

module.exports = mongoose.model('CreatorVerification', creatorVerificationSchema);
