const fs = require('fs');
const { Op } = require('sequelize');
const { Document, User } = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');

const OWNER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'department'];

function toDocumentResponse(doc) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    status: doc.status,
    rejectionReason: doc.rejectionReason,
    reviewedAt: doc.reviewedAt,
    reviewedByName: doc.reviewer ? doc.reviewer.getFullName() : undefined,
    uploadedAt: doc.uploadedAt,
    uploadedBySelf: doc.uploadedBy === doc.userId,
    uploadedByName: doc.uploader ? doc.uploader.getFullName() : undefined,
    employee: doc.owner
      ? {
          id: doc.owner.id,
          name: doc.owner.getFullName(),
          email: doc.owner.email,
          department: doc.owner.department,
        }
      : undefined,
  };
}

async function listMyDocuments(user, { category } = {}) {
  const where = { userId: user.id };
  if (category) where.category = category;

  const docs = await Document.findAll({
    where,
    include: [{ model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }],
    order: [['uploadedAt', 'DESC']],
  });

  return docs.map(toDocumentResponse);
}

async function uploadDocument(user, file, { title, category }) {
  if (!file) throw ApiError.fileRequired();

  const isSelfUpload = true;
  const doc = await Document.create({
    userId: user.id,
    uploadedBy: user.id,
    title: title || file.originalname,
    category: category || 'OTHER',
    fileName: file.originalname,
    storagePath: file.path,
    mimeType: file.mimetype,
    fileSize: file.size,
    status: isSelfUpload ? 'PENDING' : 'APPROVED',
  });

  const reviewers = await User.findAll({ where: { role: { [Op.in]: ['ADMIN', 'HR'] }, isActive: true } });
  await notificationService.notifyUsers(
    reviewers.map((r) => r.id),
    {
      type: 'DOCUMENT',
      title: 'Document uploaded',
      message: `${user.getFullName()} uploaded a new document: "${doc.title}".`,
      referenceId: doc.id,
      referenceType: 'DOCUMENT',
    }
  );

  return toDocumentResponse(doc);
}

async function getOwnedDocument(user, id) {
  const doc = await Document.findOne({ where: { id, userId: user.id } });
  if (!doc) throw ApiError.documentNotFound();
  return doc;
}

async function getDownloadInfo(user, id) {
  const doc = await getOwnedDocument(user, id);
  if (!fs.existsSync(doc.storagePath)) throw ApiError.documentNotFound();
  return { path: doc.storagePath, fileName: doc.fileName, mimeType: doc.mimeType };
}

async function deleteDocument(user, id) {
  const doc = await getOwnedDocument(user, id);
  await doc.destroy();
  fs.promises.unlink(doc.storagePath).catch(() => {
  });
}

async function adminListDocuments({
  employeeId, category, status, search, page = 1, pageSize = 20,
} = {}) {
  const where = {};
  if (employeeId) where.userId = employeeId;
  if (category) where.category = category;
  if (status) where.status = status;

  const include = [
    { model: User, as: 'owner', attributes: OWNER_ATTRS },
    { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] },
    { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'] },
  ];

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { fileName: { [Op.like]: `%${search}%` } },
    ];
  }

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await Document.findAndCountAll({
    where,
    include,
    order: [['uploadedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    documents: rows.map(toDocumentResponse),
    pagination: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function adminGetDocument(id) {
  const doc = await Document.findByPk(id, {
    include: [
      { model: User, as: 'owner', attributes: OWNER_ATTRS },
      { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] },
      { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'] },
    ],
  });
  if (!doc) throw ApiError.documentNotFound();
  return toDocumentResponse(doc);
}

async function adminGetDownloadInfo(id) {
  const doc = await Document.findByPk(id);
  if (!doc || !fs.existsSync(doc.storagePath)) throw ApiError.documentNotFound();
  return { path: doc.storagePath, fileName: doc.fileName, mimeType: doc.mimeType };
}

async function reviewDocument(actingUser, id, { status, rejectionReason }) {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, 'status must be APPROVED or REJECTED');
  }
  if (status === 'REJECTED' && !rejectionReason) {
    throw ApiError.rejectionReasonRequired();
  }

  const doc = await Document.findByPk(id);
  if (!doc) throw ApiError.documentNotFound();

  doc.status = status;
  doc.reviewedBy = actingUser.id;
  doc.reviewedAt = new Date();
  doc.rejectionReason = status === 'REJECTED' ? rejectionReason : null;
  await doc.save();

  await notificationService.notifyUser(doc.userId, {
    type: 'DOCUMENT',
    title: status === 'APPROVED' ? 'Document approved' : 'Document rejected',
    message:
      status === 'APPROVED'
        ? `Your document "${doc.title}" has been approved.`
        : `Your document "${doc.title}" was rejected. Reason: ${rejectionReason}`,
    referenceId: doc.id,
    referenceType: 'DOCUMENT',
  });

  return adminGetDocument(doc.id);
}

async function adminDocumentCounts() {
  const [total, pending, approved, rejected] = await Promise.all([
    Document.count(),
    Document.count({ where: { status: 'PENDING' } }),
    Document.count({ where: { status: 'APPROVED' } }),
    Document.count({ where: { status: 'REJECTED' } }),
  ]);
  return { total, pending, approved, rejected };
}

module.exports = {
  listMyDocuments,
  uploadDocument,
  getDownloadInfo,
  deleteDocument,
  adminListDocuments,
  adminGetDocument,
  adminGetDownloadInfo,
  reviewDocument,
  adminDocumentCounts,
};