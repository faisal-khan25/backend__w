const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const DEDUCTION_TYPES = [
  'PF',
  'PROFESSIONAL_TAX',
  'TDS',
  'LOP',
  'INSURANCE',
  'LOAN_RECOVERY',
  'SALARY_ADVANCE',
  'OTHER',
];

const PayrollDeduction = sequelize.define(
  'PayrollDeduction',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    payrollId: { type: DataTypes.STRING(36), allowNull: false, field: 'payroll_id' },
    type: { type: DataTypes.ENUM(...DEDUCTION_TYPES), allowNull: false },
    label: { type: DataTypes.STRING(120), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'payroll_deductions',
    timestamps: false,
    indexes: [{ fields: ['payroll_id'] }],
  }
);

PayrollDeduction.TYPES = DEDUCTION_TYPES;

module.exports = PayrollDeduction;
