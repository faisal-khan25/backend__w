const { Notification, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { emitToUsers } = require('../realtime/emit');

function toNotificationResponse(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    referenceId: n.referenceId,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

async function notifyUser(userId, { type, title, message, referenceId, referenceType } = {}) {
  const notification = await Notification.create({
    userId,
    type: type || 'GENERAL',
    title,
    message,
    referenceId: referenceId || null,
    referenceType: referenceType || null,
  });
  emitToUsers([userId], 'notification:new', toNotificationResponse(notification));
  return toNotificationResponse(notification);
}

async function notifyUsers(userIds = [], { type, title, message, referenceId, referenceType } = {}) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return { success: true, recipientCount: 0 };

  const rows = uniqueIds.map((userId) => ({
    userId,
    type: type || 'GENERAL',
    title,
    message,
    referenceId: referenceId || null,
    referenceType: referenceType || null,
  }));
  const created = await Notification.bulkCreate(rows);

  created.forEach((n) => {
    emitToUsers([n.userId], 'notification:new', toNotificationResponse(n));
  });

  return { success: true, recipientCount: created.length };
}

async function broadcastAnnouncement(actingUser, { title, message }) {
  const activeUsers = await User.findAll({ where: { isActive: true }, attributes: ['id'] });
  const rows = activeUsers.map((u) => ({
    userId: u.id,
    type: 'ANNOUNCEMENT',
    title,
    message,
  }));
  await Notification.bulkCreate(rows);
  return { success: true, recipientCount: rows.length };
}

async function listMyNotifications(userId, { type, unreadOnly, page = 1, pageSize = 20 } = {}) {
  const where = { userId };
  if (type) where.type = type;
  if (unreadOnly === 'true' || unreadOnly === true) where.isRead = false;

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const unreadCount = await Notification.count({ where: { userId, isRead: false } });

  return {
    notifications: rows.map(toNotificationResponse),
    unreadCount,
    pagination: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function markAsRead(userId, id) {
  const notification = await Notification.findOne({ where: { id, userId } });
  if (!notification) throw ApiError.notificationNotFound();
  notification.isRead = true;
  await notification.save();
  return toNotificationResponse(notification);
}

async function markAllAsRead(userId) {
  await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
  return { success: true };
}

async function deleteNotification(userId, id) {
  const deleted = await Notification.destroy({ where: { id, userId } });
  if (!deleted) throw ApiError.notificationNotFound();
  return { success: true };
}

module.exports = {
  notifyUser,
  notifyUsers,
  broadcastAnnouncement,
  listMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};