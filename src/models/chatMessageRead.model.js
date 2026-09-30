const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ChatMessageRead = sequelize.define(
  'ChatMessageRead',
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
    readAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'read_at',
    },
  },
  {
    tableName: 'chat_message_reads',
    timestamps: false,
    indexes: [{ fields: ['message_id', 'user_id'], unique: true }],
  }
);

module.exports = ChatMessageRead;