const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification.service');

const listMy = asyncHandler(async (req, res) => {
  const result = await notificationService.listMyNotifications(req.user.id, req.query);
  res.status(200).json(result);
});

const markAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.user.id, req.params.id);
  res.status(200).json(result);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.status(200).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(req.user.id, req.params.id);
  res.status(200).json(result);
});

const broadcast = asyncHandler(async (req, res) => {
  const result = await notificationService.broadcastAnnouncement(req.user, req.body);
  res.status(201).json(result);
});

module.exports = { listMy, markAsRead, markAllAsRead, remove, broadcast };
