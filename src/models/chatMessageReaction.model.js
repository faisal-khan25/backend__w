const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ChatMessageReaction = sequelize.define(
  'ChatMessageReaction',
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
    emoji: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'chat_message_reactions',
    timestamps: false,
    indexes: [
      { fields: ['message_id', 'user_id', 'emoji'], unique: true },
    ],
  }
);

module.exports = ChatMessageReaction;