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
    cb(new ApiError(400, `Unsupported file type "${file.mimetype}". Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX`), false);
    return;
  }
  cb(null, true);
}

const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const PROFILE_PICTURES_DIR = path.join(UPLOAD_ROOT, 'profile-pictures');
const PROFILE_PICTURE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
ensureDir(PROFILE_PICTURES_DIR);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROFILE_PICTURES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(new ApiError(400, `Unsupported image type "${file.mimetype}". Allowed: JPG, PNG, WEBP, GIF`), false);
    return;
  }
  cb(null, true);
}

const handleProfilePictureUpload = multer({
  storage: profilePictureStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: PROFILE_PICTURE_MAX_FILE_SIZE_BYTES },
}).single('profilePicture');

const MAIL_DIR = path.join(UPLOAD_ROOT, 'mail');
const MAIL_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
ensureDir(MAIL_DIR);

const mailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ownerId = req.user?.id || 'unknown';
    const dir = path.join(MAIL_DIR, ownerId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const mailAttachmentUpload = multer({
  storage: mailStorage,
  limits: { fileSize: MAIL_MAX_FILE_SIZE_BYTES },
});

const DRIVE_DIR = path.join(UPLOAD_ROOT, 'drive');
const DRIVE_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
ensureDir(DRIVE_DIR);

const driveStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ownerId = req.user?.id || 'unknown';
    const dir = path.join(DRIVE_DIR, ownerId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const driveUpload = multer({
  storage: driveStorage,
  limits: { fileSize: DRIVE_MAX_FILE_SIZE_BYTES },
});

module.exports = {
  documentUpload,
  DOCUMENTS_DIR,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  mailAttachmentUpload,
  MAIL_DIR,
  MAIL_MAX_FILE_SIZE_BYTES,
  driveUpload,
  DRIVE_DIR,
  DRIVE_MAX_FILE_SIZE_BYTES,
  handleProfilePictureUpload,
  PROFILE_PICTURES_DIR,
  PROFILE_PICTURE_MAX_FILE_SIZE_BYTES,
};