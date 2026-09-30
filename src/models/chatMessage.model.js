const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE', 'VIDEO', 'AUDIO', 'MEETING', 'SYSTEM'];

const ChatMessage = sequelize.define(
  'ChatMessage',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    conversationId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'conversation_id',
    },
    senderId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'sender_id',
    },
    messageType: {
      type: DataTypes.ENUM(...MESSAGE_TYPES),
      allowNull: false,
      defaultValue: 'TEXT',
      field: 'message_type',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    replyToMessageId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'reply_to_message_id',
    },
    meetingId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'meeting_id',
    },
    mentionedUserIds: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: 'mentioned_user_ids',
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_edited',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
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
    tableName: 'chat_messages',
    timestamps: false,
    indexes: [
      { fields: ['conversation_id', 'created_at'] },
      { fields: ['sender_id'] },
      { fields: ['reply_to_message_id'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

ChatMessage.TYPES = MESSAGE_TYPES;

module.exports = ChatMessage;