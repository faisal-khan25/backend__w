const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');


const STATUSES = ['SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED'];

const ChatMeeting = sequelize.define(
  'ChatMeeting',
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
    createdBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'created_by',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: 'Team Meeting',
    },
    meetingUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'meeting_url',
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_at',
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'chat_meetings',
    timestamps: false,
    indexes: [{ fields: ['conversation_id'] }],
  }
);

ChatMeeting.STATUSES = STATUSES;

module.exports = ChatMeeting;