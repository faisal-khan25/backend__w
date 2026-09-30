const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');


const EVENT_TYPES = [
  'MEETING',
  'INTERVIEW',
  'TRAINING',
  'HOLIDAY',
  'LEAVE',
  'BIRTHDAY',
  'COMPANY_EVENT',
  'PERSONAL',
  'TASK_DEADLINE',
  'ATTENDANCE',
];

const STATUSES = ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

const VISIBILITIES = ['PRIVATE', 'TEAM', 'ORGANIZATION'];

const CalendarEvent = sequelize.define(
  'CalendarEvent',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    organizerId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'organizer_id',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'starts_at',
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'ends_at',
    },
    allDay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'all_day',
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    
    meetingId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'meeting_id',
    },
    isCancelled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_cancelled',
    },
    
    eventType: {
      type: DataTypes.ENUM(...EVENT_TYPES),
      allowNull: false,
      defaultValue: 'MEETING',
      field: 'event_type',
    },
    
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    },
    
    visibility: {
      type: DataTypes.ENUM(...VISIBILITIES),
      allowNull: false,
      defaultValue: 'PRIVATE',
    },
    
    createdBy: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'created_by',
    },
    updatedBy: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'updated_by',
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
    tableName: 'calendar_events',
    timestamps: false,
    indexes: [
      { fields: ['organizer_id'] },
      { fields: ['starts_at'] },
      { fields: ['meeting_id'] },
      { fields: ['event_type'] },
      { fields: ['created_by'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

CalendarEvent.EVENT_TYPES = EVENT_TYPES;
CalendarEvent.STATUSES = STATUSES;
CalendarEvent.VISIBILITIES = VISIBILITIES;

module.exports = CalendarEvent;