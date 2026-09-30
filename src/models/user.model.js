const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const ROLES = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firebaseUid: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'users',
    timestamps: false,
    hooks: {
      beforeUpdate: (user) => {
        user.updatedAt = new Date();
      },
    },
  }
);

User.prototype.getFullName = function getFullName() {
  if (!this.lastName || this.lastName.trim() === '') {
    return this.firstName;
  }
  return `${this.firstName} ${this.lastName}`;
};

User.ROLES = ROLES;

module.exports = User;
