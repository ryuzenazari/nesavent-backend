const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');
const eventUploadDir = path.join(__dirname, '../../uploads/events');
const profileUploadDir = path.join(__dirname, '../../uploads/profiles');
const documentUploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(eventUploadDir)) {
  fs.mkdirSync(eventUploadDir, { recursive: true });
}
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, { recursive: true });
}
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, eventUploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentUploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan'), false);
  }
};
const documentFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Gunakan PDF, JPG, PNG, atau DOC/DOCX'), false);
  }
};
const eventUpload = multer({
  storage: eventStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
});
const profileUpload = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 
  }
});
const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
});
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Ukuran file terlalu besar' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      message: `Error upload: ${err.message}` 
    });
  } else if (err) {
    logger.error(`File upload error: ${err.message}`);
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
  next();
};
module.exports = {
  eventUpload,
  profileUpload,
  documentUpload,
  handleUploadError
}; 