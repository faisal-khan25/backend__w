const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const NOTIFICATION_TYPES = [
  'ANNOUNCEMENT',
  'LEAVE_APPROVAL',
  'ATTENDANCE_ALERT',
  'PAYROLL',
  'TASK',
  'DOCUMENT',
  'GENERAL',
  'CHAT',
  'EMAIL',
  'DRIVE',
];

const Notification = sequelize.define(
  'Notification',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    userId: { type: DataTypes.STRING(36), allowNull: false, field: 'user_id' },
    type: { type: DataTypes.ENUM(...NOTIFICATION_TYPES), allowNull: false, defaultValue: 'GENERAL' },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.STRING(1000), allowNull: false },
    referenceId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'reference_id',
    },
    referenceType: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'reference_type',
    },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'notifications',
    timestamps: false,
    indexes: [{ fields: ['user_id', 'is_read'] }],
  }
);

Notification.TYPES = NOTIFICATION_TYPES;

module.exports = Notification;