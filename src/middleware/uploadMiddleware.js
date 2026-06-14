import fs from 'fs';
import multer from 'multer';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
  if (!isPdf) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

const uploadPdf = upload.fields([
  { name: 'invoiceFile', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

const normalizeUploadFile = (req, res, next) => {
  if (!req.file) {
    req.file = req.files?.invoiceFile?.[0] || req.files?.file?.[0];
  }
  next();
};

const handleUploadError = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File size must be 10MB or less'
      : err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Only PDF files are allowed'
        : err.message;

    return res.status(400).json({ error: message });
  }

  return res.status(400).json({ error: err.message || 'File upload failed' });
};

export { handleUploadError, normalizeUploadFile, uploadPdf };

