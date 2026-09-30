const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const MeetingParticipant = sequelize.define(
  'MeetingParticipant',
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
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
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
    
    isCameraOn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_camera_on',
    },
    isMicOn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_mic_on',
    },
    isScreenSharing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_screen_sharing',
    },
  },
  {
    tableName: 'meeting_participants',
    timestamps: false,
    indexes: [
      { fields: ['meeting_id'] },
      { fields: ['user_id'] },
      { fields: ['meeting_id', 'user_id'] },
      
      { fields: ['meeting_id', 'left_at'] },
    ],
  }
);

module.exports = MeetingParticipant;
