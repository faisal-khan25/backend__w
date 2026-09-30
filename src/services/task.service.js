const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');
const { Task, User } = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');

const ASSIGNEE_INCLUDE = { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'department'] };
const ASSIGNER_INCLUDE = { model: User, as: 'assigner', attributes: ['id', 'firstName', 'lastName'] };

function userSummary(user) {
  if (!user) return null;
  return { id: user.id, name: user.getFullName(), email: user.email, department: user.department };
}

function toTaskResponse(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    startDate: task.startDate,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    progress: task.progress,
    instructions: task.instructions,
    comments: task.comments || [],
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignedBy:
      task.assigner && task.assignedBy !== task.assignedTo
        ? { id: task.assigner.id, name: task.assigner.getFullName() }
        : null,
  };
}

function toAdminTaskResponse(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    startDate: task.startDate,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    progress: task.progress,
    instructions: task.instructions,
    comments: task.comments || [],
    batchId: task.batchId,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignedTo: userSummary(task.assignee),
    assignedBy: userSummary(task.assigner),
  };
}

async function listMyTasks(user, { status } = {}) {
  const where = { assignedTo: user.id };
  if (status) where.status = status;

  const tasks = await Task.findAll({
    where,
    include: [ASSIGNER_INCLUDE],
    order: [
      ['status', 'ASC'],
      ['dueDate', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });

  return tasks.map(toTaskResponse);
}

async function createTask(user, { title, description, startDate, dueDate, priority }) {
  const task = await Task.create({
    title,
    description: description || null,
    startDate: startDate || null,
    dueDate: dueDate || null,
    priority: priority || 'MEDIUM',
    status: 'PENDING',
    assignedTo: user.id,
    assignedBy: user.id,
  });

  return toTaskResponse(task);
}

async function getOwnedTask(user, id) {
  const task = await Task.findOne({
    where: { id, assignedTo: user.id },
    include: [ASSIGNER_INCLUDE],
  });
  if (!task) throw ApiError.taskNotFound();
  return task;
}

async function getMyTask(user, id) {
  const task = await getOwnedTask(user, id);
  return toTaskResponse(task);
}

async function updateTask(user, id, updates) {
  const task = await getOwnedTask(user, id);
  const isSelfCreated = task.assignedBy === task.assignedTo;

  const { title, description, startDate, dueDate, priority, status, progress } = updates;
  const attemptsRestrictedField =
    title !== undefined || description !== undefined || startDate !== undefined ||
    dueDate !== undefined || priority !== undefined;

  if (attemptsRestrictedField && !isSelfCreated) {
    throw ApiError.taskFieldNotEditableByEmployee();
  }

  if (isSelfCreated) {
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description || null;
    if (startDate !== undefined) task.startDate = startDate || null;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (priority !== undefined) task.priority = priority;
  }

  if (status !== undefined) {
    task.status = status;
    task.completedAt = status === 'COMPLETED' ? new Date() : null;
  }
  if (progress !== undefined) task.progress = progress;

  await task.save();
  return toTaskResponse(task);
}

async function updateStatus(user, id, status) {
  if (!Task.STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${Task.STATUSES.join(', ')}`);
  }

  const task = await getOwnedTask(user, id);
  task.status = status;
  task.completedAt = status === 'COMPLETED' ? new Date() : null;
  await task.save();

  return toTaskResponse(task);
}

async function addMyComment(user, id, message) {
  const task = await getOwnedTask(user, id);
  const comments = Array.isArray(task.comments) ? task.comments : [];
  comments.push({
    id: uuidv4(),
    authorId: user.id,
    authorName: user.getFullName(),
    message,
    createdAt: new Date().toISOString(),
  });
  task.comments = comments;
  await task.save();

  return toTaskResponse(task);
}

async function deleteTask(user, id) {
  const task = await getOwnedTask(user, id);
  if (task.assignedBy !== task.assignedTo) {
    throw ApiError.taskNotDeletableByEmployee();
  }
  await task.destroy();
}

async function resolveAssignees(assignedTo) {
  const ids = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) throw ApiError.noAssigneesProvided();

  const users = await User.findAll({ where: { id: uniqueIds, isActive: true } });
  if (users.length !== uniqueIds.length) {
    const foundIds = new Set(users.map((u) => u.id));
    const missingId = uniqueIds.find((id) => !foundIds.has(id));
    throw ApiError.invalidAssignee(missingId);
  }
  return users;
}

async function reloadWithRelations(id) {
  return Task.findByPk(id, { include: [ASSIGNEE_INCLUDE, ASSIGNER_INCLUDE] });
}

async function adminListTasks({ employeeId, status, priority, dueFrom, dueTo, search, sort, page = 1, pageSize = 20 } = {}) {
  const where = {};
  if (employeeId) where.assignedTo = employeeId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (dueFrom || dueTo) {
    where.dueDate = {};
    if (dueFrom) where.dueDate[Op.gte] = dueFrom;
    if (dueTo) where.dueDate[Op.lte] = dueTo;
  }
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  let order;
  if (sort === 'due_date') order = [['dueDate', 'ASC']];
  else if (sort === 'priority') order = [[sequelize.literal("FIELD(priority, 'URGENT','HIGH','MEDIUM','LOW')"), 'ASC']];
  else if (sort === 'status') order = [['status', 'ASC']];
  else order = [['createdAt', 'DESC']];

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await Task.findAndCountAll({
    where,
    include: [ASSIGNEE_INCLUDE, ASSIGNER_INCLUDE],
    order,
    limit,
    offset,
  });

  return {
    tasks: rows.map(toAdminTaskResponse),
    pagination: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function adminGetTask(id) {
  const task = await reloadWithRelations(id);
  if (!task) throw ApiError.taskNotFound();
  return toAdminTaskResponse(task);
}

async function adminCreateTask(adminUser, { title, description, assignedTo, priority, status, startDate, dueDate, instructions }) {
  const assignees = await resolveAssignees(assignedTo);
  const batchId = assignees.length > 1 ? uuidv4() : null;

  const createdTasks = await Promise.all(
    assignees.map((assignee) =>
      Task.create({
        title,
        description: description || null,
        assignedTo: assignee.id,
        assignedBy: adminUser.id,
        batchId,
        startDate: startDate || null,
        dueDate: dueDate || null,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        instructions: instructions || null,
      })
    )
  );

  await Promise.all(
    assignees.map((assignee, i) =>
      notificationService.notifyUser(assignee.id, {
        type: 'TASK',
        title: 'New task assigned',
        message: `${adminUser.getFullName()} assigned you a task: "${title}"`,
        referenceId: createdTasks[i].id,
      })
    )
  );

  const withRelations = await Task.findAll({
    where: { id: createdTasks.map((t) => t.id) },
    include: [ASSIGNEE_INCLUDE, ASSIGNER_INCLUDE],
  });

  if (withRelations.length === 1) {
    return toAdminTaskResponse(withRelations[0]);
  }
  return { batchId, count: withRelations.length, tasks: withRelations.map(toAdminTaskResponse) };
}

async function adminUpdateTask(adminUser, id, updates) {
  const task = await Task.findByPk(id);
  if (!task) throw ApiError.taskNotFound();

  const { title, description, assignedTo, priority, status, startDate, dueDate, progress, instructions } = updates;

  if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
    const [assignee] = await resolveAssignees(assignedTo);
    task.assignedTo = assignee.id;
    await notificationService.notifyUser(assignee.id, {
      type: 'TASK',
      title: 'Task assigned to you',
      message: `${adminUser.getFullName()} assigned you a task: "${task.title}"`,
      referenceId: task.id,
    });
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description || null;
  if (priority !== undefined) task.priority = priority;
  if (startDate !== undefined) task.startDate = startDate || null;
  if (dueDate !== undefined) task.dueDate = dueDate || null;
  if (instructions !== undefined) task.instructions = instructions || null;
  if (progress !== undefined) task.progress = progress;
  if (status !== undefined) {
    task.status = status;
    task.completedAt = status === 'COMPLETED' ? new Date() : null;
  }

  await task.save();
  return toAdminTaskResponse(await reloadWithRelations(task.id));
}

async function adminReassignTask(adminUser, id, assignedTo, note) {
  const task = await Task.findByPk(id);
  if (!task) throw ApiError.taskNotFound();

  const [assignee] = await resolveAssignees(assignedTo);
  task.assignedTo = assignee.id;

  if (note) {
    const comments = Array.isArray(task.comments) ? task.comments : [];
    comments.push({
      id: uuidv4(),
      authorId: adminUser.id,
      authorName: adminUser.getFullName(),
      message: `Reassigned: ${note}`,
      createdAt: new Date().toISOString(),
    });
    task.comments = comments;
  }

  await task.save();

  await notificationService.notifyUser(assignee.id, {
    type: 'TASK',
    title: 'Task assigned to you',
    message: `${adminUser.getFullName()} assigned you a task: "${task.title}"`,
    referenceId: task.id,
  });

  return toAdminTaskResponse(await reloadWithRelations(task.id));
}

async function adminRemoveTask(adminUser, id, { hard = false } = {}) {
  const task = await Task.findByPk(id);
  if (!task) throw ApiError.taskNotFound();

  if (hard) {
    await task.destroy();
    return { success: true, deleted: true };
  }

  task.status = 'CANCELLED';
  await task.save();
  return { success: true, cancelled: true };
}

module.exports = {
  listMyTasks,
  createTask,
  getMyTask,
  updateTask,
  updateStatus,
  addMyComment,
  deleteTask,
  adminListTasks,
  adminGetTask,
  adminCreateTask,
  adminUpdateTask,
  adminReassignTask,
  adminRemoveTask,
};