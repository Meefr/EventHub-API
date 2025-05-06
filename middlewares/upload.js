const path = require('path');
const multer = require('multer');
const { ErrorResponse } = require('./errorHandler');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const eventId = req.params.id || 'events';
    const eventDir = path.join(uploadDir, eventId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }
    
    cb(null, eventDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const fileExt = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${fileExt}`);
  }
});

// File filter - only allow specific image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  
  // Check extension
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new ErrorResponse('Only image files are allowed', 400), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5000000 // Default: 5MB
  },
  fileFilter: fileFilter
});

module.exports = upload;