const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const EmailAttachment = sequelize.define(
  'EmailAttachment',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    messageId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'message_id',
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
      allowNull: true,
      field: 'mime_type',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'email_attachments',
    timestamps: false,
    indexes: [{ fields: ['message_id'] }],
  }
);

module.exports = EmailAttachment;