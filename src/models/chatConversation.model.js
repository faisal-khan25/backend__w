const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');


const TYPES = ['DIRECT', 'GROUP', 'SPACE'];

const ChatConversation = sequelize.define(
  'ChatConversation',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    type: {
      type: DataTypes.ENUM(...TYPES),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    directKey: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'direct_key',
    },
    spaceId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'space_id',
    },
    createdBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'created_by',
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_message_at',
    },
    lastMessagePreview: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'last_message_preview',
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_archived',
    },
    isMeetingOnly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_meeting_only',
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
    tableName: 'chat_conversations',
    timestamps: false,
    indexes: [
      { fields: ['direct_key'], unique: true },
      { fields: ['space_id'] },
      { fields: ['type'] },
      { fields: ['last_message_at'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

ChatConversation.buildDirectKey = (userIdA, userIdB) =>
  [userIdA, userIdB].sort().join(':');

ChatConversation.TYPES = TYPES;

module.exports = ChatConversation;