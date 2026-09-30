const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ChatSpace = sequelize.define(
  'ChatSpace',
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
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    conversationId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'conversation_id',
    },
    createdBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'created_by',
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_archived',
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
    tableName: 'chat_spaces',
    timestamps: false,
    indexes: [{ fields: ['conversation_id'], unique: true }],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

module.exports = ChatSpace;