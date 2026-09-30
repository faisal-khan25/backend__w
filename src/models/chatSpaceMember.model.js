const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ROLES = ['MANAGER', 'MEMBER'];

const ChatSpaceMember = sequelize.define(
  'ChatSpaceMember',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    spaceId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'space_id',
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
    },
    role: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
      defaultValue: 'MEMBER',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'joined_at',
    },
  },
  {
    tableName: 'chat_space_members',
    timestamps: false,
    indexes: [
      { fields: ['space_id', 'user_id'], unique: true },
      { fields: ['user_id'] },
    ],
  }
);

ChatSpaceMember.ROLES = ROLES;

module.exports = ChatSpaceMember;