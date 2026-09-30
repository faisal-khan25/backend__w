const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const PasswordResetOtp = sequelize.define(
  'PasswordResetOtp',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otpHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiryTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'password_reset_otps',
    timestamps: false,
  }
);

module.exports = PasswordResetOtp;
