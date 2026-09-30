const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const STATUSES = ['DRAFT', 'CALCULATED', 'APPROVED', 'FINALIZED', 'PAYSLIP_GENERATED', 'PAID'];

const PAYMENT_STATUSES = ['UNPAID', 'PAID'];

const PayrollRecord = sequelize.define(
  'PayrollRecord',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    employeeId: { type: DataTypes.STRING(36), allowNull: false, field: 'employee_id' },
    month: { type: DataTypes.INTEGER, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },

    salaryStructureId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'salary_structure_id',
    },

    basicSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'basic_salary' },
    hra: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    otherAllowances: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'other_allowances',
    },
    otherEarnings: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'other_earnings',
    },
    grossSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'gross_salary' },
    totalEarnings: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_earnings',
    },

    manualOverride: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'manual_override' },
    originalGrossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'original_gross_salary',
    },
    overrideReason: { type: DataTypes.STRING(500), allowNull: true, field: 'override_reason' },
    overriddenBy: { type: DataTypes.STRING(36), allowNull: true, field: 'overridden_by' },
    overriddenAt: { type: DataTypes.DATE, allowNull: true, field: 'overridden_at' },

    workingDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0, field: 'working_days' },
    presentDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0, field: 'present_days' },
    paidLeaveDays: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
      field: 'paid_leave_days',
    },
    unpaidLeaveDays: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
      field: 'unpaid_leave_days',
    },
    absentDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0, field: 'absent_days' },
    lopDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0, field: 'lop_days' },
    lopAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'lop_amount' },

    pf: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    professionalTax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'professional_tax',
    },
    tds: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    insurance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    loanRecovery: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'loan_recovery',
    },
    salaryAdvance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'salary_advance',
    },
    otherDeductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'other_deductions',
    },
    totalDeductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_deductions',
    },

    netSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'net_salary' },

    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: 'DRAFT' },
    paymentStatus: {
      type: DataTypes.ENUM(...PAYMENT_STATUSES),
      allowNull: false,
      defaultValue: 'UNPAID',
      field: 'payment_status',
    },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'payment_date' },
    paymentReference: { type: DataTypes.STRING(100), allowNull: true, field: 'payment_reference' },

    createdBy: { type: DataTypes.STRING(36), allowNull: true, field: 'created_by' },
    approvedBy: { type: DataTypes.STRING(36), allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    finalizedBy: { type: DataTypes.STRING(36), allowNull: true, field: 'finalized_by' },
    finalizedAt: { type: DataTypes.DATE, allowNull: true, field: 'finalized_at' },
    paidBy: { type: DataTypes.STRING(36), allowNull: true, field: 'paid_by' },

    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    tableName: 'payrolls',
    timestamps: false,
    indexes: [{ unique: true, fields: ['employee_id', 'month', 'year'] }],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

PayrollRecord.STATUSES = STATUSES;
PayrollRecord.PAYMENT_STATUSES = PAYMENT_STATUSES;
PayrollRecord.LOCKED_STATUSES = ['FINALIZED', 'PAYSLIP_GENERATED', 'PAID'];

module.exports = PayrollRecord;
