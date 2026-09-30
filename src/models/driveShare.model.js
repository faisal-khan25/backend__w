const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const PERMISSIONS = ['VIEW', 'EDIT'];

const DriveShare = sequelize.define(
  'DriveShare',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    itemId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'item_id',
    },
    sharedWithUserId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'shared_with_user_id',
    },
    sharedBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'shared_by',
    },
    permission: {
      type: DataTypes.ENUM(...PERMISSIONS),
      allowNull: false,
      defaultValue: 'VIEW',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'drive_shares',
    timestamps: false,
    indexes: [
      { fields: ['item_id'] },
      { fields: ['shared_with_user_id'] },
      { unique: true, fields: ['item_id', 'shared_with_user_id'] },
    ],
  }
);

DriveShare.PERMISSIONS = PERMISSIONS;

module.exports = DriveShare;