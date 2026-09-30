const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const STATUSES = ['GENERATED', 'PAID'];

const Payslip = sequelize.define(
  'Payslip',
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
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    basicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'basic_salary',
    },
    allowances: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    netPay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'net_pay',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'INR',
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'GENERATED',
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    generatedBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'generated_by',
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'generated_at',
    },
    payrollId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'payroll_id',
    },
    payslipNumber: {
      type: DataTypes.STRING(60),
      allowNull: true,
      unique: true,
      field: 'payslip_number',
    },
    pdfPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'pdf_path',
    },
    paymentReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'payment_reference',
    },
  },
  {
    tableName: 'payslips',
    timestamps: false,
    indexes: [{ unique: true, fields: ['user_id', 'month', 'year'] }],
  }
);

Payslip.STATUSES = STATUSES;

module.exports = Payslip;
