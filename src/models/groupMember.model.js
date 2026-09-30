const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');


const GROUP_ROLES = ['GROUP_ADMIN', 'MEMBER'];
const LEGACY_ADMIN_ROLE = 'ADMIN';
const GROUP_ROLE_ENUM = [...GROUP_ROLES, LEGACY_ADMIN_ROLE];

const GroupMember = sequelize.define(
  'GroupMember',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    groupId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'group_id',
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id',
    },
    role: {
      type: DataTypes.ENUM(...GROUP_ROLE_ENUM),
      allowNull: false,
      defaultValue: 'MEMBER',
    },
    lastReadAt: {
      
      type: DataTypes.DATE(3),
      allowNull: true,
      field: 'last_read_at',
    },
    joinedAt: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'joined_at',
    },
    leftAt: {
      type: DataTypes.DATE(3),
      allowNull: true,
      field: 'left_at',
    },
  },
  {
    tableName: 'chat_group_members',
    timestamps: false,
    indexes: [
      { fields: ['group_id', 'user_id'], unique: true },
      { fields: ['user_id'] },
    ],
  }
);

GroupMember.ROLES = GROUP_ROLES;
GroupMember.ROLE_ENUM = GROUP_ROLE_ENUM;
GroupMember.LEGACY_ADMIN_ROLE = LEGACY_ADMIN_ROLE;

GroupMember.ADMIN_ROLE_VALUES = ['GROUP_ADMIN', LEGACY_ADMIN_ROLE];


GroupMember.normalizeRole = function normalizeRole(role) {
  return role === LEGACY_ADMIN_ROLE ? 'GROUP_ADMIN' : role;
};


GroupMember.isAdminRole = function isAdminRole(role) {
  return GroupMember.normalizeRole(role) === 'GROUP_ADMIN';
};

module.exports = GroupMember;
