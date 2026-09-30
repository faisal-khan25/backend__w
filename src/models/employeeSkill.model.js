const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const EmployeeSkill = sequelize.define(
  'EmployeeSkill',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    userId: { type: DataTypes.STRING(36), allowNull: false, field: 'user_id' },
    skillName: { type: DataTypes.STRING(100), allowNull: false, field: 'skill_name' },
    proficiency: { type: DataTypes.ENUM(...PROFICIENCY_LEVELS), allowNull: false, defaultValue: 'INTERMEDIATE' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'employee_skills',
    timestamps: false,
    indexes: [{ unique: true, fields: ['user_id', 'skill_name'] }],
  }
);

EmployeeSkill.PROFICIENCY_LEVELS = PROFICIENCY_LEVELS;

module.exports = EmployeeSkill;
