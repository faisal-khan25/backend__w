const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DemoRequest = sequelize.define(
  'DemoRequest',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    workEmail: {
      type: DataTypes.STRING(160),
      allowNull: false,
      field: 'work_email',
    },
    company: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    companySize: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'company_size',
    },
    message: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'received_at',
    },
  },
  {
    tableName: 'demo_requests',
    timestamps: false,
  }
);

module.exports = DemoRequest;
