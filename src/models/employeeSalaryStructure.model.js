const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const EmployeeSalaryStructure = sequelize.define(
  'EmployeeSalaryStructure',
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
    basicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'basic_salary',
    },
    hra: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    otherAllowances: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'other_allowances',
    },
    grossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'gross_salary',
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'effective_from',
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_to',
    },
    createdBy: { type: DataTypes.STRING(36), allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.STRING(36), allowNull: true, field: 'updated_by' },
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
    tableName: 'employee_salary_structures',
    timestamps: false,
    indexes: [
      { fields: ['user_id', 'effective_from'] },
      { fields: ['user_id', 'effective_to'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

module.exports = EmployeeSalaryStructure;
