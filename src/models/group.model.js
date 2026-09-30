const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');


const Group = sequelize.define(
  'Group',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    icon: {
     
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'created_by',
    },
    isDeleted: {
     
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'chat_groups',
    timestamps: false,
    indexes: [{ fields: ['created_by'] }, { fields: ['is_deleted'] }],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

module.exports = Group;
