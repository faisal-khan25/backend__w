const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const CATEGORIES = [
  'ID_PROOF',
  'PAN',
  'RESUME',
  'OFFER_LETTER',
  'EXPERIENCE_LETTER',
  'EDUCATION_CERTIFICATE',
  'BANK_DOCUMENT',
  'JOINING_DOCUMENT',
  'CONTRACT',
  'CERTIFICATE',
  'PAYSLIP',
  'POLICY',
  'OTHER',
];

const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const Document = sequelize.define(
  'Document',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
    },
    uploadedBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'uploaded_by',
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(...CATEGORIES),
      allowNull: false,
      defaultValue: 'OTHER',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
    },
    storagePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'storage_path',
    },
    mimeType: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'mime_type',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size',
    },
    status: {
      type: DataTypes.ENUM(...APPROVAL_STATUSES),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    reviewedBy: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'reviewed_by',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
    },
    rejectionReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'rejection_reason',
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at',
    },
  },
  {
    tableName: 'documents',
    timestamps: false,
    indexes: [{ fields: ['user_id'] }, { fields: ['status'] }, { fields: ['category'] }],
  }
);

Document.CATEGORIES = CATEGORIES;
Document.APPROVAL_STATUSES = APPROVAL_STATUSES;

module.exports = Document;