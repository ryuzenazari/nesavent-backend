const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi direktori upload
const uploadDir = process.env.UPLOAD_PATH || './uploads';

// Pastikan direktori upload ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi untuk upload gambar event
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const eventDir = path.join(uploadDir, 'events');
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }
    cb(null, eventDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'event-' + uniqueSuffix + ext);
  }
});

// Konfigurasi untuk upload gambar profil
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileDir = path.join(uploadDir, 'profile');
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// Filter untuk gambar
const imageFilter = (req, file, cb) => {
  // Cek tipe file
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (ext && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'));
  }
};

// Middleware untuk upload event
const eventUpload = multer({
  storage: eventStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware untuk upload profil
const profileUpload = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// Export middleware
const uploadEventImage = eventUpload.single('image');
const uploadEventBanner = eventUpload.single('banner');
const uploadEventImages = eventUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]);
const uploadProfileImage = profileUpload.single('profileImage');

module.exports = {
  uploadEventImage,
  uploadEventBanner,
  uploadEventImages,
  uploadProfileImage
}; 