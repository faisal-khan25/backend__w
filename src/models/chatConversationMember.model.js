const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ROLES = ['OWNER', 'ADMIN', 'MEMBER'];

const ChatConversationMember = sequelize.define(
  'ChatConversationMember',
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
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
    },
    role: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
      defaultValue: 'MEMBER',
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_muted',
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_pinned',
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_archived',
    },
    lastReadMessageId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'last_read_message_id',
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_read_at',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'joined_at',
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'left_at',
    },
  },
  {
    tableName: 'chat_conversation_members',
    timestamps: false,
    indexes: [
      { fields: ['conversation_id', 'user_id'], unique: true },
      { fields: ['user_id'] },
    ],
  }
);

ChatConversationMember.ROLES = ROLES;

module.exports = ChatConversationMember;