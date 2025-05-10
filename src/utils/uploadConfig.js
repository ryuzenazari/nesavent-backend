const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

const eventUploadDir = path.join(__dirname, '../../uploads/events');
const profileUploadDir = path.join(__dirname, '../../uploads/profiles');
const documentUploadDir = path.join(__dirname, '../../uploads/documents');

if (!fs.existsSync(eventUploadDir)) {
  fs.mkdirSync(eventUploadDir, {
    recursive: true
  });
}
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, {
    recursive: true
  });
}
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, {
    recursive: true
  });
}

const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/events/');
  },
  filename: (req, file, cb) => {
    const randomString = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${randomString}${path.extname(file.originalname)}`);
  }
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const randomString = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${randomString}${path.extname(file.originalname)}`);
  }
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const randomString = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${randomString}${path.extname(file.originalname)}`);
  }
});

const ktmStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/ktm/');
  },
  filename: (req, file, cb) => {
    const randomString = crypto.randomBytes(8).toString('hex');
    cb(null, `ktm-${req.user.id}-${Date.now()}-${randomString}${path.extname(file.originalname)}`);
  }
});

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);
  
  if (ext && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'));
  }
};

const documentFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);
  
  if (ext && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file pdf atau gambar yang diperbolehkan!'));
  }
};

const eventUpload = multer({
  storage: eventStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFileFilter
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: documentFileFilter
});

const ktmUpload = multer({
  storage: ktmStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: documentFileFilter
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
  ktmUpload,
  handleUploadError
};
