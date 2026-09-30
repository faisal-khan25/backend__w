const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '..', '..', 'uploads');
const GROUP_ICON_DIR = path.join(UPLOAD_ROOT, 'group-icons');

fs.mkdirSync(GROUP_ICON_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_ICON_SIZE_BYTES = Number(process.env.GROUP_ICON_MAX_MB || 5) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GROUP_ICON_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadGroupIcon = multer({
  storage,
  limits: { fileSize: MAX_ICON_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new ApiError(400, `Unsupported image type "${file.mimetype}". Allowed: JPG, PNG, WEBP, GIF`)
      );
    }
    cb(null, true);
  },
}).single('icon');

function handleGroupIconUpload(req, res, next) {
  uploadGroupIcon(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

const GROUP_ATTACHMENT_DIR = path.join(UPLOAD_ROOT, 'group-attachments');

fs.mkdirSync(GROUP_ATTACHMENT_DIR, { recursive: true });

const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
];

const MAX_ATTACHMENT_SIZE_BYTES =
  Number(process.env.CHAT_MAX_ATTACHMENT_MB || 25) * 1024 * 1024;

const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(GROUP_ATTACHMENT_DIR, req.params.groupId || 'misc');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadGroupAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      return cb(ApiError.unsupportedAttachmentType());
    }
    cb(null, true);
  },
}).single('file');

function handleGroupAttachmentUpload(req, res, next) {
  uploadGroupAttachment(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

module.exports = {
  handleGroupIconUpload,
  handleGroupAttachmentUpload,
  GROUP_ICON_DIR,
  GROUP_ATTACHMENT_DIR,
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  UPLOAD_ROOT,
};
