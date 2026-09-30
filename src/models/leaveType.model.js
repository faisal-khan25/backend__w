const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const LeaveType = sequelize.define(
  'LeaveType',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
    },
    annualQuota: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'annual_quota',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_paid',
    },
  },
  {
    tableName: 'leave_types',
    timestamps: false,
  }
);

module.exports = LeaveType;
