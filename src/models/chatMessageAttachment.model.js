const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ChatMessageAttachment = sequelize.define(
  'ChatMessageAttachment',
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

    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_name',
    },

    storedName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'stored_name',
    },

    mimeType: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'mime_type',
    },

    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    storagePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'storage_path',
    },

    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'chat_message_attachments',
    timestamps: false,

    indexes: [
      {
        fields: ['message_id'],
      },
    ],
  }
);

module.exports = ChatMessageAttachment;