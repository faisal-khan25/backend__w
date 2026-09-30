const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const RSVP_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'];

const CalendarEventAttendee = sequelize.define(
  'CalendarEventAttendee',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    eventId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'event_id',
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
    },
    status: {
      type: DataTypes.ENUM(...RSVP_STATUSES),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'responded_at',
    },
  },
  {
    tableName: 'calendar_event_attendees',
    timestamps: false,
    indexes: [
      { fields: ['event_id'] },
      { fields: ['user_id'] },
      { unique: true, fields: ['event_id', 'user_id'] },
    ],
  }
);

CalendarEventAttendee.STATUSES = RSVP_STATUSES;

module.exports = CalendarEventAttendee;
