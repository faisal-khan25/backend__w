const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const GROUP_MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'];

const GroupMessage = sequelize.define(
  'GroupMessage',
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
    senderId: {
     
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'sender_id',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    messageType: {
      type: DataTypes.ENUM(...GROUP_MESSAGE_TYPES),
      allowNull: false,
      defaultValue: 'TEXT',
      field: 'message_type',
    },
    attachmentUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'attachment_url',
    },
    attachmentName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'attachment_name',
    },
    attachmentSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'attachment_size',
    },
    attachmentMimeType: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'attachment_mime_type',
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
    tableName: 'chat_group_messages',
    timestamps: false,
    indexes: [
      { fields: ['group_id', 'created_at'] },
      { fields: ['sender_id'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

GroupMessage.TYPES = GROUP_MESSAGE_TYPES;

module.exports = GroupMessage;
