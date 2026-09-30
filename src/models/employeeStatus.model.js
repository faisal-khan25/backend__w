const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const STATUS_TYPES = ['MEETING', 'BUSY', 'DO_NOT_DISTURB', 'AWAY', 'CUSTOM'];

const DEFAULT_LABELS = {
  MEETING: 'In a meeting',
  BUSY: 'Busy',
  DO_NOT_DISTURB: 'Do not disturb',
  AWAY: 'Away',
  CUSTOM: '',
};

const EmployeeStatus = sequelize.define(
  'EmployeeStatus',
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
    statusType: {
      type: DataTypes.ENUM(...STATUS_TYPES),
      allowNull: false,
      field: 'status_type',
    },
    message: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_time',
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_time',
    },
    isCleared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_cleared',
    },
    expiryNotified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'expiry_notified',
    },
    activationNotified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'activation_notified',
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
    tableName: 'employee_statuses',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'end_time'] },
      { fields: ['is_cleared', 'end_time'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

EmployeeStatus.STATUS_TYPES = STATUS_TYPES;
EmployeeStatus.DEFAULT_LABELS = DEFAULT_LABELS;

module.exports = EmployeeStatus;