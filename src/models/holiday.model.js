const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const HOLIDAY_TYPES = ['COMPANY', 'PUBLIC', 'OPTIONAL'];

const Holiday = sequelize.define(
  'Holiday',
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
    name: { type: DataTypes.STRING(150), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.ENUM(...HOLIDAY_TYPES), allowNull: false, defaultValue: 'COMPANY' },
    description: { type: DataTypes.STRING(500), allowNull: true },
    createdBy: { type: DataTypes.STRING(36), allowNull: true, field: 'created_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'holidays',
    timestamps: false,
    indexes: [{ unique: true, fields: ['date', 'name'] }],
  }
);

Holiday.TYPES = HOLIDAY_TYPES;

module.exports = Holiday;
