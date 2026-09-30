const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const STATUSES = ['ONLINE', 'AWAY', 'DO_NOT_DISTURB', 'OFFLINE'];

const ChatPresence = sequelize.define(
  'ChatPresence',
  {
    userId: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      field: 'user_id',
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'OFFLINE',
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_active_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'chat_presence',
    timestamps: false,
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

ChatPresence.STATUSES = STATUSES;

module.exports = ChatPresence;