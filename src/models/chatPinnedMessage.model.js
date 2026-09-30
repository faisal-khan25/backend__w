const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ChatPinnedMessage = sequelize.define(
  'ChatPinnedMessage',
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
    messageId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'message_id',
    },
    pinnedBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'pinned_by',
    },
    pinnedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'pinned_at',
    },
  },
  {
    tableName: 'chat_pinned_messages',
    timestamps: false,
    indexes: [
      { fields: ['conversation_id', 'message_id'], unique: true },
      { fields: ['conversation_id'] },
    ],
  }
);

module.exports = ChatPinnedMessage;