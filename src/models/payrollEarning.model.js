const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const EARNING_TYPES = ['BASIC', 'HRA', 'ALLOWANCE', 'OTHER'];

const PayrollEarning = sequelize.define(
  'PayrollEarning',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    payrollId: { type: DataTypes.STRING(36), allowNull: false, field: 'payroll_id' },
    type: { type: DataTypes.ENUM(...EARNING_TYPES), allowNull: false },
    label: { type: DataTypes.STRING(120), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'payroll_earnings',
    timestamps: false,
    indexes: [{ fields: ['payroll_id'] }],
  }
);

PayrollEarning.TYPES = EARNING_TYPES;

module.exports = PayrollEarning;
