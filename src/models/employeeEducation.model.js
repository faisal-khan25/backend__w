const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const EmployeeEducation = sequelize.define(
  'EmployeeEducation',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    userId: { type: DataTypes.STRING(36), allowNull: false, field: 'user_id' },
    degree: { type: DataTypes.STRING(150), allowNull: false },
    institution: { type: DataTypes.STRING(200), allowNull: false },
    fieldOfStudy: { type: DataTypes.STRING(150), allowNull: true, field: 'field_of_study' },
    startYear: { type: DataTypes.INTEGER, allowNull: true, field: 'start_year' },
    endYear: { type: DataTypes.INTEGER, allowNull: true, field: 'end_year' },
    grade: { type: DataTypes.STRING(20), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  { tableName: 'employee_education', timestamps: false }
);

module.exports = EmployeeEducation;
