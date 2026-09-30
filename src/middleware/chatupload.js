const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '..', '..', 'uploads');
const CHAT_DIR = path.join(UPLOAD_ROOT, 'chat-attachments');

[UPLOAD_ROOT, CHAT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED_MIME_TYPES = [
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
];

const MAX_FILE_SIZE_BYTES = Number(process.env.CHAT_MAX_ATTACHMENT_MB || 25) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(CHAT_DIR, req.params.conversationId || 'misc');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadChatAttachment = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(ApiError.unsupportedAttachmentType());
    }
    cb(null, true);
  },
}).single('file');

function handleChatAttachmentUpload(req, res, next) {
  uploadChatAttachment(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

module.exports = { handleChatAttachmentUpload, CHAT_DIR, UPLOAD_ROOT };