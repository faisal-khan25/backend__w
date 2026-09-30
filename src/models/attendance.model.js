const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const STATUSES = [
  'PRESENT',
  'LATE',
  'HALF_DAY',
  'WORK_FROM_HOME',
  'ABSENT',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEKEND',
];

const LATE_AFTER_HOUR = 9;
const LATE_AFTER_MINUTE = 30;

const Attendance = sequelize.define(
  'Attendance',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    punchIn: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'punch_in',
    },
    punchOut: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'punch_out',
    },
    totalHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'total_hours',
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'PRESENT',
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'ip_address',
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    deviceInfo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'device_info',
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
    tableName: 'attendance',
    timestamps: false,
    indexes: [{ unique: true, fields: ['user_id', 'date'] }],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

Attendance.STATUSES = STATUSES;
Attendance.LATE_AFTER_HOUR = LATE_AFTER_HOUR;
Attendance.LATE_AFTER_MINUTE = LATE_AFTER_MINUTE;

module.exports = Attendance;