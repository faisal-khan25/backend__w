const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SalarySlip = sequelize.define(
  'SalarySlip',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    payrollId: { type: DataTypes.STRING(36), allowNull: false, unique: true, field: 'payroll_id' },
    slipNumber: { type: DataTypes.STRING(30), allowNull: true, unique: true, field: 'slip_number' },
    generatedBy: { type: DataTypes.STRING(36), allowNull: false, field: 'generated_by' },
    generatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'generated_at' },
  },
  { tableName: 'salary_slips', timestamps: false }
);

module.exports = SalarySlip;
