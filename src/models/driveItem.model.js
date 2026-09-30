const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ITEM_TYPES = ['FILE', 'FOLDER'];

const DriveItem = sequelize.define(
  'DriveItem',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    ownerId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'owner_id',
    },
    type: {
      type: DataTypes.ENUM(...ITEM_TYPES),
      allowNull: false,
      defaultValue: 'FILE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    parentId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'parent_id',
    },
    mimeType: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'mime_type',
    },
    storagePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'storage_path',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size',
    },
    isStarred: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_starred',
    },
    isTrashed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_trashed',
    },
    trashedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'trashed_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'drive_items',
    timestamps: false,
    indexes: [
      { fields: ['owner_id'] },
      { fields: ['parent_id'] },
      { fields: ['owner_id', 'is_trashed'] },
      { fields: ['owner_id', 'is_starred'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

DriveItem.TYPES = ITEM_TYPES;

module.exports = DriveItem;