const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const PayrollAudit = sequelize.define(
  'PayrollAudit',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    payrollId: { type: DataTypes.STRING(36), allowNull: false, field: 'payroll_id' },
    action: { type: DataTypes.STRING(40), allowNull: false },
    fromStatus: { type: DataTypes.STRING(30), allowNull: true, field: 'from_status' },
    toStatus: { type: DataTypes.STRING(30), allowNull: true, field: 'to_status' },
    performedBy: { type: DataTypes.STRING(36), allowNull: false, field: 'performed_by' },
    remarks: { type: DataTypes.STRING(1000), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'payroll_audits',
    timestamps: false,
    indexes: [{ fields: ['payroll_id'] }],
  }
);

module.exports = PayrollAudit;
