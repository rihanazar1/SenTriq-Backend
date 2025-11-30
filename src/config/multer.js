const multer = require('multer');
const path = require('path');

// Memory storage for direct upload to ImageKit
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for files
    fieldSize: 10 * 1024 * 1024 // 10MB limit for text fields (for large blog content with base64 images)
  },
  fileFilter: fileFilter
});

module.exports = upload;
