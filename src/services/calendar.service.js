const { Op } = require('sequelize');
const {
  CalendarEvent,
  CalendarEventAttendee,
  User,
  EmployeeProfile,
} = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');
const holidayService = require('./holiday.service');
const leaveService = require('./leave.service');
const { broadcastToUser } = require('../realtime/socket');

const SYSTEM_MANAGED_TYPES = ['HOLIDAY', 'LEAVE', 'BIRTHDAY'];

const CREATABLE_TYPES_BY_ROLE = {
  ADMIN: ['MEETING', 'INTERVIEW', 'TRAINING', 'COMPANY_EVENT', 'PERSONAL', 'TASK_DEADLINE', 'ATTENDANCE'],
  HR: ['MEETING', 'INTERVIEW', 'TRAINING', 'COMPANY_EVENT', 'PERSONAL', 'TASK_DEADLINE', 'ATTENDANCE'],
  MANAGER: ['MEETING', 'INTERVIEW', 'TRAINING', 'PERSONAL', 'TASK_DEADLINE', 'ATTENDANCE'],
  EMPLOYEE: ['MEETING', 'PERSONAL', 'TASK_DEADLINE'],
};

const VISIBILITIES_BY_ROLE = {
  ADMIN: ['PRIVATE', 'TEAM', 'ORGANIZATION'],
  HR: ['PRIVATE', 'TEAM', 'ORGANIZATION'],
  MANAGER: ['PRIVATE', 'TEAM'],
  EMPLOYEE: ['PRIVATE'],
};

function assertEventTypeAllowed(user, eventType) {
  if (SYSTEM_MANAGED_TYPES.includes(eventType)) {
    throw ApiError.calendarForbiddenEventType(
      `${eventType} events are generated automatically and can't be created directly`
    );
  }
  const allowed = CREATABLE_TYPES_BY_ROLE[user.role] || [];
  if (!allowed.includes(eventType)) {
    throw ApiError.calendarForbiddenEventType(`Your role cannot create ${eventType} events`);
  }
}

function assertVisibilityAllowed(user, visibility) {
  const allowed = VISIBILITIES_BY_ROLE[user.role] || ['PRIVATE'];
  if (!allowed.includes(visibility)) {
    throw ApiError.calendarForbiddenVisibility(`Your role cannot create ${visibility} events`);
  }
}

async function resolveTeamScope(user) {
  if (user.role === 'ADMIN' || user.role === 'HR') {
    return { restricted: false, userIds: null };
  }

  if (user.role === 'MANAGER') {
    const directReports = await EmployeeProfile.findAll({
      where: { reportingManagerId: user.id },
      attributes: ['userId'],
    });
    let userIds = directReports.map((p) => p.userId);

    if (userIds.length === 0 && user.department) {
      const peers = await User.findAll({
        where: { department: user.department, isActive: true },
        attributes: ['id'],
      });
      userIds = peers.map((p) => p.id);
    }
    if (!userIds.includes(user.id)) userIds.push(user.id);
    return { restricted: true, userIds };
  }

  return { restricted: true, userIds: [user.id] };
}

const BRIEF_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage', 'department'];
const ORGANIZER_INCLUDE = { model: User, as: 'organizer', attributes: BRIEF_ATTRS };
const CREATOR_INCLUDE = { model: User, as: 'creator', attributes: BRIEF_ATTRS };
const ATTENDEE_INCLUDE = {
  model: CalendarEventAttendee,
  as: 'attendees',
  include: [{ model: User, as: 'user', attributes: BRIEF_ATTRS }],
};

function userBrief(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.getFullName(),
    email: u.email,
    profileImage: u.profileImage,
    department: u.department,
  };
}

function toEventResponse(event, viewerId) {
  const attendees = (event.attendees || []).map((a) => ({
    id: a.id,
    userId: a.userId,
    status: a.status,
    respondedAt: a.respondedAt,
    user: userBrief(a.user),
  }));
  const viewerAttendee = attendees.find((a) => a.userId === viewerId);

  return {
    id: event.id,
    kind: 'EVENT',
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    status: event.status,
    visibility: event.visibility,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    color: event.color,
    organizer: userBrief(event.organizer),
    createdBy: event.createdBy,
    creator: userBrief(event.creator),
    isOrganizer: event.organizerId === viewerId,
    isMine: event.organizerId === viewerId || event.createdBy === viewerId,
    myStatus: viewerAttendee ? viewerAttendee.status : event.organizerId === viewerId ? 'ACCEPTED' : undefined,
    attendees,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

async function loadFullEvent(id) {
  return CalendarEvent.findByPk(id, {
    include: [ORGANIZER_INCLUDE, CREATOR_INCLUDE, ATTENDEE_INCLUDE],
  });
}

function isVisibleByBroadcast(event, user, teamUserIds) {
  if (event.visibility === 'ORGANIZATION') return true;
  if (event.visibility === 'TEAM') {
    if (!teamUserIds) return true;
    return teamUserIds.includes(event.organizerId) || teamUserIds.includes(event.createdBy);
  }
  return false;
}

async function listEvents(user, { from, to, eventType, employeeId, department, scope } = {}) {
  const effectiveScope = scope || (user.role === 'EMPLOYEE' ? 'mine' : 'team');
  if (effectiveScope === 'org' && !['ADMIN', 'HR'].includes(user.role)) {
    throw ApiError.calendarForbiddenVisibility('Only Admin/HR can view the organization calendar');
  }

  const attendeeRows = await CalendarEventAttendee.findAll({ where: { userId: user.id }, attributes: ['eventId'] });
  const invitedEventIds = attendeeRows.map((r) => r.eventId);

  const mineClause = {
    [Op.or]: [
      { organizerId: user.id },
      { createdBy: user.id },
      { id: { [Op.in]: invitedEventIds.length ? invitedEventIds : [''] } },
    ],
  };

  let where;
  if (effectiveScope === 'mine') {
    where = { ...mineClause };
  } else if (effectiveScope === 'org') {
    where = { visibility: { [Op.in]: ['TEAM', 'ORGANIZATION'] } };
  } else {
    const { restricted, userIds } = await resolveTeamScope(user);
    const teamClause = restricted
      ? {
          visibility: { [Op.in]: ['TEAM', 'ORGANIZATION'] },
          [Op.or]: [{ organizerId: { [Op.in]: userIds } }, { createdBy: { [Op.in]: userIds } }],
        }
      : { visibility: { [Op.in]: ['TEAM', 'ORGANIZATION'] } };
    where = { [Op.or]: [mineClause, teamClause] };
  }

  where.isCancelled = false;
  if (eventType) where.eventType = eventType;

  const andClauses = [];
  if (from) andClauses.push({ endsAt: { [Op.gte]: new Date(from) } });
  if (to) andClauses.push({ startsAt: { [Op.lte]: new Date(to) } });
  if (employeeId) {
    andClauses.push({
      [Op.or]: [{ organizerId: employeeId }, { id: { [Op.in]: await eventIdsForAttendee(employeeId) } }],
    });
  }
  if (andClauses.length) where[Op.and] = [...(where[Op.and] || []), ...andClauses];

  const include = [ORGANIZER_INCLUDE, CREATOR_INCLUDE, ATTENDEE_INCLUDE];
  if (department) {
    include[0] = { ...ORGANIZER_INCLUDE, where: { department }, required: true };
  }

  const events = await CalendarEvent.findAll({ where, include, order: [['startsAt', 'ASC']] });
  return events.map((e) => toEventResponse(e, user.id));
}

async function eventIdsForAttendee(userId) {
  const rows = await CalendarEventAttendee.findAll({ where: { userId }, attributes: ['eventId'] });
  return rows.map((r) => r.eventId).length ? rows.map((r) => r.eventId) : [''];
}

async function assertAccess(event, user) {
  if (event.organizerId === user.id || event.createdBy === user.id) return;
  if (['ADMIN', 'HR'].includes(user.role)) return;
  const invited = await CalendarEventAttendee.findOne({ where: { eventId: event.id, userId: user.id } });
  if (invited) return;
  if (event.visibility === 'ORGANIZATION') return;
  if (event.visibility === 'TEAM') {
    const { userIds } = await resolveTeamScope(user);
    if (userIds && (userIds.includes(event.organizerId) || userIds.includes(event.createdBy))) return;
  }
  throw ApiError.calendarNotInvited();
}

async function getEvent(user, id) {
  const event = await loadFullEvent(id);
  if (!event) throw ApiError.calendarEventNotFound();
  await assertAccess(event, user);
  return toEventResponse(event, user.id);
}

function assertCanManage(event, user) {
  if (event.organizerId === user.id || event.createdBy === user.id) return;
  if (['ADMIN', 'HR'].includes(user.role)) return;
  throw ApiError.calendarNotEditable();
}

async function assertParticipantsAllowed(user, participantIds) {
  if (!participantIds.length) return;
  if (['ADMIN', 'HR', 'EMPLOYEE'].includes(user.role)) return;

  if (user.role === 'MANAGER') {
    const { userIds } = await resolveTeamScope(user);
    const outsideTeam = participantIds.filter((id) => !userIds.includes(id));
    if (outsideTeam.length) {
      throw ApiError.calendarForbiddenParticipant('You can only invite members of your own team to a team event');
    }
  }
}

async function createEvent(user, body) {
  const {
    title,
    description,
    eventType = 'MEETING',
    location,
    startsAt,
    endsAt,
    allDay,
    color,
    visibility = 'PRIVATE',
    organizerId,
    participantIds = [],
  } = body;

  if (!title || !title.trim()) throw ApiError.calendarEventTitleRequired();
  if (!startsAt || !endsAt) throw new ApiError(400, 'startsAt and endsAt are required');
  if (new Date(endsAt) < new Date(startsAt)) throw ApiError.calendarInvalidDateRange();

  assertEventTypeAllowed(user, eventType);
  assertVisibilityAllowed(user, visibility);

  const effectiveOrganizerId =
    organizerId && ['ADMIN', 'HR'].includes(user.role) ? organizerId : user.id;

  const uniqueParticipantIds = [...new Set(participantIds)].filter((id) => id !== effectiveOrganizerId);
  if (uniqueParticipantIds.length) {
    const activeUsers = await User.findAll({ where: { id: { [Op.in]: uniqueParticipantIds }, isActive: true } });
    if (activeUsers.length !== uniqueParticipantIds.length) throw ApiError.calendarForbiddenParticipant('One or more participants were not found or are inactive');
    await assertParticipantsAllowed(user, uniqueParticipantIds);
  }

  const event = await CalendarEvent.create({
    organizerId: effectiveOrganizerId,
    title: title.trim(),
    description: description || null,
    location: location || null,
    startsAt,
    endsAt,
    allDay: !!allDay,
    color: color || null,
    eventType,
    visibility,
    status: 'SCHEDULED',
    createdBy: user.id,
    updatedBy: user.id,
  });

  if (uniqueParticipantIds.length) {
    await CalendarEventAttendee.bulkCreate(
      uniqueParticipantIds.map((userId) => ({ eventId: event.id, userId }))
    );
    await notificationService.notifyUsers(uniqueParticipantIds, {
      type: 'CALENDAR',
      title: 'New event invitation',
      message: `${user.getFullName()} invited you to "${event.title}"`,
      referenceId: event.id,
      referenceType: 'CALENDAR_EVENT',
    });
    uniqueParticipantIds.forEach((id) => broadcastToUser(id, 'calendar:invited', { eventId: event.id }));
  }

  return getEvent(user, event.id);
}

async function updateEvent(user, id, body) {
  const event = await CalendarEvent.findByPk(id);
  if (!event) throw ApiError.calendarEventNotFound();
  assertCanManage(event, user);

  const { title, description, eventType, location, startsAt, endsAt, allDay, color, visibility, status } = body;

  if (eventType !== undefined) {
    assertEventTypeAllowed(user, eventType);
    event.eventType = eventType;
  }
  if (visibility !== undefined) {
    assertVisibilityAllowed(user, visibility);
    event.visibility = visibility;
  }
  if (title !== undefined) event.title = title.trim();
  if (description !== undefined) event.description = description;
  if (location !== undefined) event.location = location;
  if (startsAt !== undefined) event.startsAt = startsAt;
  if (endsAt !== undefined) event.endsAt = endsAt;
  if (allDay !== undefined) event.allDay = allDay;
  if (color !== undefined) event.color = color;
  if (status !== undefined) {
    if (!CalendarEvent.STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');
    event.status = status;
    event.isCancelled = status === 'CANCELLED';
  }

  if (new Date(event.endsAt) < new Date(event.startsAt)) throw ApiError.calendarInvalidDateRange();

  event.updatedBy = user.id;
  await event.save();

  const attendees = await CalendarEventAttendee.findAll({ where: { eventId: id } });
  attendees.forEach((a) => broadcastToUser(a.userId, 'calendar:updated', { eventId: id }));

  return getEvent(user, id);
}

async function deleteEvent(user, id) {
  const event = await CalendarEvent.findByPk(id);
  if (!event) throw ApiError.calendarEventNotFound();
  assertCanManage(event, user);

  const attendees = await CalendarEventAttendee.findAll({ where: { eventId: id } });
  event.isCancelled = true;
  event.status = 'CANCELLED';
  event.updatedBy = user.id;
  await event.save();

  attendees.forEach((a) => broadcastToUser(a.userId, 'calendar:cancelled', { eventId: id }));
  if (attendees.length) {
    await notificationService.notifyUsers(attendees.map((a) => a.userId), {
      type: 'CALENDAR',
      title: 'Event cancelled',
      message: `"${event.title}" was cancelled`,
      referenceId: event.id,
      referenceType: 'CALENDAR_EVENT',
    });
  }

  return { success: true };
}

async function addParticipants(user, id, userIds = []) {
  const event = await CalendarEvent.findByPk(id);
  if (!event) throw ApiError.calendarEventNotFound();
  assertCanManage(event, user);

  const existing = await CalendarEventAttendee.findAll({ where: { eventId: id }, attributes: ['userId'] });
  const existingIds = new Set(existing.map((e) => e.userId));
  const newIds = [...new Set(userIds)].filter((uid) => uid !== event.organizerId && !existingIds.has(uid));
  if (!newIds.length) return getEvent(user, id);

  const activeUsers = await User.findAll({ where: { id: { [Op.in]: newIds }, isActive: true } });
  if (activeUsers.length !== newIds.length) throw ApiError.calendarForbiddenParticipant('One or more participants were not found or are inactive');
  await assertParticipantsAllowed(user, newIds);

  await CalendarEventAttendee.bulkCreate(newIds.map((userId) => ({ eventId: id, userId })));
  await notificationService.notifyUsers(newIds, {
    type: 'CALENDAR',
    title: 'New event invitation',
    message: `${user.getFullName()} invited you to "${event.title}"`,
    referenceId: event.id,
    referenceType: 'CALENDAR_EVENT',
  });
  newIds.forEach((uid) => broadcastToUser(uid, 'calendar:invited', { eventId: id }));

  return getEvent(user, id);
}

async function updateParticipant(user, id, participantId, { status }) {
  if (!CalendarEventAttendee.STATUSES.includes(status)) {
    throw new ApiError(400, 'status must be one of ACCEPTED, DECLINED, TENTATIVE');
  }
  const attendee = await CalendarEventAttendee.findOne({ where: { id: participantId, eventId: id } });
  if (!attendee) throw ApiError.calendarParticipantNotFound();
  if (attendee.userId !== user.id) throw ApiError.calendarNotInvited();

  attendee.status = status;
  attendee.respondedAt = new Date();
  await attendee.save();

  const event = await CalendarEvent.findByPk(id);
  if (event) broadcastToUser(event.organizerId, 'calendar:rsvp', { eventId: id, userId: user.id, status });

  return getEvent(user, id);
}

async function listHolidays({ year, type } = {}) {
  return holidayService.listHolidays({ year, type });
}

async function listLeaves(user, { from, to } = {}) {
  const { restricted, userIds } = await resolveTeamScope(user);
  return leaveService.listApprovedLeavesInRange({ from, to, userIds: restricted ? userIds : undefined });
}

async function listBirthdays({ month } = {}) {
  const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
  const profiles = await EmployeeProfile.findAll({
    where: { dateOfBirth: { [Op.ne]: null } },
    include: [{ model: User, as: 'User', attributes: BRIEF_ATTRS, where: { isActive: true } }],
  });

  return profiles
    .filter((p) => {
      const dob = new Date(`${p.dateOfBirth}T00:00:00Z`);
      return dob.getUTCMonth() + 1 === targetMonth;
    })
    .map((p) => ({
      userId: p.userId,
      employee: userBrief(p.User),
      dateOfBirth: p.dateOfBirth,
      day: new Date(`${p.dateOfBirth}T00:00:00Z`).getUTCDate(),
    }))
    .sort((a, b) => a.day - b.day);
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  addParticipants,
  updateParticipant,
  listHolidays,
  listLeaves,
  listBirthdays,
};