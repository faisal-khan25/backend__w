const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const CALL_TYPES = ['audio', 'video'];

const CALL_STATUSES = [
  'ringing',
  'active',
  'ended',
  'rejected',
  'cancelled',
  'missed',
  'failed',
];

const CallRecord = sequelize.define(
  'CallRecord',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    meetingId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'meeting_id',
    },
    callerId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'caller_id',
    },
    receiverId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'receiver_id',
    },
    conversationId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'conversation_id',
    },
    callType: {
      type: DataTypes.ENUM(...CALL_TYPES),
      allowNull: false,
      defaultValue: 'video',
      field: 'call_type',
    },
    status: {
      type: DataTypes.ENUM(...CALL_STATUSES),
      allowNull: false,
      defaultValue: 'ringing',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'started_at',
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'accepted_at',
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ended_at',
    },
  },
  {
    tableName: 'call_records',
    timestamps: false,
    indexes: [
      { fields: ['caller_id'] },
      { fields: ['receiver_id'] },
      { fields: ['meeting_id'] },
      { fields: ['status'] },
      { fields: ['caller_id', 'status'] },
      { fields: ['receiver_id', 'status'] },
    ],
  }
);

CallRecord.TYPES = CALL_TYPES;
CallRecord.STATUSES = CALL_STATUSES;

module.exports = CallRecord;
