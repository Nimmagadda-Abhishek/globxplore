const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure AWS S3 Client
const s3Config = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure Multer to use S3
const upload = multer({
  storage: multerS3({
    s3: s3Config,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Create a unique file name with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `agents/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit size to 5MB
  fileFilter: (req, file, cb) => {
    // Check for images
    const filetypes = /jpeg|jpg|png|webp|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and pdfs (jpeg, jpg, png, webp, pdf) are allowed'));
    }
  },
});

module.exports = upload;
