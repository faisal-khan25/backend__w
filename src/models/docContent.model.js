const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DocContent = sequelize.define(
  'DocContent',
  {
    itemId: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      field: 'item_id',
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      
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
    tableName: 'doc_contents',
    timestamps: false,
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

module.exports = DocContent;
