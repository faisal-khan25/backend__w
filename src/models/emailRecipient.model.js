const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const RECIPIENT_TYPES = ['TO', 'CC', 'BCC'];


const EmailRecipient = sequelize.define(
  'EmailRecipient',
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
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
    },
    type: {
      type: DataTypes.ENUM(...RECIPIENT_TYPES),
      allowNull: false,
      defaultValue: 'TO',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
    isStarred: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_starred',
    },
    isTrashed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_trashed',
    },
    trashedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'trashed_at',
    },
    
    isSpam: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_spam',
    },
    spamAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'spam_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'email_recipients',
    timestamps: false,
    indexes: [
      { fields: ['message_id'] },
      { fields: ['user_id'] },
      { fields: ['user_id', 'is_trashed'] },
      { fields: ['user_id', 'is_spam'] },
    ],
  }
);

EmailRecipient.TYPES = RECIPIENT_TYPES;

module.exports = EmailRecipient;