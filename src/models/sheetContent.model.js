const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SheetContent = sequelize.define(
  'SheetContent',
  {
    itemId: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      field: 'item_id',
    },
    cells: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      
    },
    sheetNames: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '["Sheet1"]',
      field: 'sheet_names',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    lastEditedBy: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'last_edited_by',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'sheet_contents',
    timestamps: false,
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

module.exports = SheetContent;
