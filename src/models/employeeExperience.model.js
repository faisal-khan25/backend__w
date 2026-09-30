const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const EmployeeExperience = sequelize.define(
  'EmployeeExperience',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    userId: { type: DataTypes.STRING(36), allowNull: false, field: 'user_id' },
    companyName: { type: DataTypes.STRING(200), allowNull: false, field: 'company_name' },
    designation: { type: DataTypes.STRING(150), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
    isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_current' },
    description: { type: DataTypes.STRING(1000), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  { tableName: 'employee_experience', timestamps: false }
);

module.exports = EmployeeExperience;
