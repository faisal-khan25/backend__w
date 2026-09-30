const { Op } = require('sequelize');
const {
  Task,
  LeaveRequest,
  Notification,
  DriveItem,
} = require('../models');
const chatService = require('./chat.service');
const meetingService = require('./meeting.service');
const calendarService = require('./calendar.service');

async function getMyDashboard(user) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    openTaskCount,
    overdueTaskCount,
    pendingLeaveCount,
    unreadNotificationCount,
    recentDriveItems,
    upcomingEvents,
    myMeetings,
    conversations,
  ] = await Promise.all([
    Task.count({ where: { assignedTo: user.id, status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] } } }),
    Task.count({
      where: {
        assignedTo: user.id,
        status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] },
        dueDate: { [Op.lt]: now.toISOString().slice(0, 10) },
      },
    }),
    LeaveRequest.count({ where: { userId: user.id, status: 'PENDING' } }),
    Notification.count({ where: { userId: user.id, isRead: false } }),
    DriveItem.findAll({
      where: { ownerId: user.id, isTrashed: false },
      order: [['updatedAt', 'DESC']],
      limit: 5,
    }),
    calendarService.listMyEvents(user, { from: now.toISOString(), to: in7Days.toISOString() }),
    meetingService.listMyMeetings(user),
    chatService.listConversations(user, {}),
  ]);

  const unreadChatMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return {
    tasks: { open: openTaskCount, overdue: overdueTaskCount },
    leaves: { pending: pendingLeaveCount },
    notifications: { unread: unreadNotificationCount },
    chat: {
      unreadConversations: conversations.filter((c) => c.unreadCount > 0).length,
      unreadMessages: unreadChatMessages,
    },
    calendar: { upcoming: upcomingEvents.slice(0, 5) },
    meetings: { upcoming: myMeetings.slice(0, 5) },
    drive: {
      recent: recentDriveItems.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        mimeType: item.mimeType,
        updatedAt: item.updatedAt,
      })),
    },
  };
}

module.exports = { getMyDashboard };
