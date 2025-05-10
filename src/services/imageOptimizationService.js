const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const QUALITY_LEVELS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40
};

const SIZES = {
  THUMBNAIL: { width: 300, height: 200 },
  MEDIUM: { width: 600, height: 400 },
  LARGE: { width: 1200, height: 800 }
};

const optimizeImage = async (inputPath, outputFolder, options = {}) => {
  const {
    quality = QUALITY_LEVELS.HIGH,
    resize = null,
    format = 'webp',
    filename = uuidv4()
  } = options;

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const outputPath = path.join(outputFolder, `${filename}.${format}`);
  
  let sharpInstance = sharp(inputPath);
  
  if (resize) {
    sharpInstance = sharpInstance.resize(resize.width, resize.height, {
      fit: 'cover',
      position: 'center'
    });
  }
  
  switch (format) {
    case 'webp':
      await sharpInstance.webp({ quality }).toFile(outputPath);
      break;
    case 'jpeg':
    case 'jpg':
      await sharpInstance.jpeg({ quality }).toFile(outputPath);
      break;
    case 'png':
      await sharpInstance.png({ quality }).toFile(outputPath);
      break;
    default:
      await sharpInstance.webp({ quality }).toFile(outputPath);
  }
  
  return outputPath;
};

const generateEventImageVariants = async (inputPath, eventId) => {
  const outputFolder = path.join('uploads', 'events', eventId.toString());
  
  const results = {
    original: inputPath,
    variants: {}
  };
  
  for (const [sizeName, dimensions] of Object.entries(SIZES)) {
    results.variants[sizeName.toLowerCase()] = await optimizeImage(
      inputPath, 
      outputFolder, 
      {
        resize: dimensions,
        filename: `${eventId}_${sizeName.toLowerCase()}`,
        quality: sizeName === 'THUMBNAIL' ? QUALITY_LEVELS.MEDIUM : QUALITY_LEVELS.HIGH
      }
    );
  }
  
  return results;
};

module.exports = {
  QUALITY_LEVELS,
  SIZES,
  optimizeImage,
  generateEventImageVariants
}; 