const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const LeaveRequest = sequelize.define(
  'LeaveRequest',
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
    leaveTypeId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'leave_type_id',
    },
    fromDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'from_date',
    },
    toDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'to_date',
    },
    days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    decidedBy: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'decided_by',
    },
    decisionNote: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'decision_note',
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'applied_at',
    },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'decided_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'leave_requests',
    timestamps: false,
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

LeaveRequest.STATUSES = STATUSES;

module.exports = LeaveRequest;
