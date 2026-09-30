const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');


const EmailMessage = sequelize.define(
  'EmailMessage',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    senderId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'sender_id',
    },
    subject: {
      type: DataTypes.STRING(300),
      allowNull: false,
      defaultValue: '(no subject)',
    },
    bodyText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'body_text',
    },
    isDraft: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_draft',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at',
    },
    senderStarred: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'sender_starred',
    },
    senderTrashed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'sender_trashed',
    },
    senderTrashedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sender_trashed_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'email_messages',
    timestamps: false,
    indexes: [{ fields: ['sender_id'] }, { fields: ['is_draft'] }],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

module.exports = EmailMessage;