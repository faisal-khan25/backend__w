const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const Task = sequelize.define(
  'Task',
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'assigned_to',
    },
    assignedBy: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'assigned_by',
    },
    batchId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'batch_id',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'start_date',
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'due_date',
    },
    priority: {
      type: DataTypes.ENUM(...PRIORITIES),
      allowNull: false,
      defaultValue: 'MEDIUM',
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    instructions: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
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
    tableName: 'tasks',
    timestamps: false,
    indexes: [
      { fields: ['assigned_to'] },
      { fields: ['assigned_by'] },
      { fields: ['batch_id'] },
      { fields: ['status'] },
      { fields: ['due_date'] },
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

Task.STATUSES = STATUSES;
Task.PRIORITIES = PRIORITIES;

module.exports = Task;