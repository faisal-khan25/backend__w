const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '..', '..', 'uploads');
const DOCUMENTS_DIR = path.join(UPLOAD_ROOT, 'documents');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
ensureDir(DOCUMENTS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ownerId = req.user?.id || 'unknown';
    const dir = path.join(DOCUMENTS_DIR, ownerId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const err = new ApiError(400, `Unsupported file type "${file.mimetype}". Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX`);
    cb(err, false);
    return;
  }
  cb(null, true);
}

const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = { documentUpload, DOCUMENTS_DIR, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };
