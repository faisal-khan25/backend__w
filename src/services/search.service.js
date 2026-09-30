const { Op } = require('sequelize');
const {
  ChatConversation,
  ChatConversationMember,
  ChatMessage,
  EmailMessage,
  EmailRecipient,
  DriveItem,
  DriveShare,
  DocContent,
  CalendarEvent,
  CalendarEventAttendee,
  ChatMeeting,
  User,
  EmployeeProfile,
} = require('../models');

const USER_BRIEF_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage', 'department'];

function userBrief(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: typeof u.getFullName === 'function' ? u.getFullName() : [u.firstName, u.lastName].filter(Boolean).join(' '),
    email: u.email,
    profileImage: u.profileImage,
    department: u.department,
  };
}

function escapeLike(q) {
  return q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function snippetAround(text, q, radius = 60) {
  if (!text) return '';
  const plain = String(text).replace(/\s+/g, ' ').trim();
  const idx = plain.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return plain.slice(0, radius * 2).trim();
  const start = Math.max(0, idx - radius);
  const end = Math.min(plain.length, idx + q.length + radius);
  return `${start > 0 ? '…' : ''}${plain.slice(start, end).trim()}${end < plain.length ? '…' : ''}`;
}

async function searchChat(user, q, { limit, offset }) {
  const like = `%${escapeLike(q)}%`;

  const memberships = await ChatConversationMember.findAll({
    where: { userId: user.id, leftAt: null },
    attributes: ['conversationId'],
  });
  const conversationIds = memberships.map((m) => m.conversationId);
  if (!conversationIds.length) return { items: [], total: 0 };

  const [messageTotal, conversationTotal, messages, conversations] = await Promise.all([
    ChatMessage.count({
      where: { conversationId: { [Op.in]: conversationIds }, isDeleted: false, content: { [Op.like]: like } },
    }),
    ChatConversation.count({
      where: { id: { [Op.in]: conversationIds }, isMeetingOnly: false, name: { [Op.like]: like } },
    }),
    ChatMessage.findAll({
      where: { conversationId: { [Op.in]: conversationIds }, isDeleted: false, content: { [Op.like]: like } },
      include: [
        { model: User, as: 'sender', attributes: USER_BRIEF_ATTRS },
        { model: ChatConversation, as: 'conversation', attributes: ['id', 'name', 'type'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    }),
    ChatConversation.findAll({
      where: { id: { [Op.in]: conversationIds }, isMeetingOnly: false, name: { [Op.like]: like } },
      order: [['lastMessageAt', 'DESC']],
      limit: 5,
    }),
  ]);

  const messageItems = messages.map((m) => ({
    id: m.id,
    module: 'chat',
    type: 'message',
    title: m.conversation?.name || (m.sender ? m.sender.getFullName() : 'Direct message'),
    snippet: snippetAround(m.content, q),
    user: userBrief(m.sender),
    date: m.createdAt,
    meta: { conversationId: m.conversationId, conversationType: m.conversation?.type, messageId: m.id },
  }));

  const conversationItems = conversations.map((c) => ({
    id: c.id,
    module: 'chat',
    type: 'conversation',
    title: c.name,
    snippet: `${c.type === 'GROUP' ? 'Group' : 'Space'} chat`,
    user: null,
    date: c.lastMessageAt,
    meta: { conversationId: c.id, conversationType: c.type },
  }));

  return {
    items: [...conversationItems, ...messageItems].slice(0, limit),
    total: messageTotal + conversationTotal,
  };
}

async function searchMail(user, q, { limit, offset }) {
  const like = `%${escapeLike(q)}%`;
  const searchClause = {
    [Op.or]: [{ subject: { [Op.like]: like } }, { bodyText: { [Op.like]: like } }],
  };

  const sentWhere = { senderId: user.id, isDraft: false, senderTrashed: false, ...searchClause };
  const receivedWhere = { isDraft: false, ...searchClause };
  const senderInclude = { model: User, as: 'sender', attributes: USER_BRIEF_ATTRS };
  const recipientMeInclude = {
    model: EmailRecipient,
    as: 'recipients',
    where: { userId: user.id, isTrashed: false, isSpam: false },
    required: true,
    attributes: [],
  };

  const [sentTotal, receivedTotal, sentRows, receivedRows] = await Promise.all([
    EmailMessage.count({ where: sentWhere }),
    EmailMessage.count({ where: receivedWhere, include: [recipientMeInclude], distinct: true, col: 'id' }),
    EmailMessage.findAll({ where: sentWhere, include: [senderInclude], order: [['createdAt', 'DESC']], limit: offset + limit }),
    EmailMessage.findAll({ where: receivedWhere, include: [senderInclude, recipientMeInclude], order: [['createdAt', 'DESC']], limit: offset + limit }),
  ]);

  const merged = [...sentRows, ...receivedRows]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(offset, offset + limit);

  const items = merged.map((m) => ({
    id: m.id,
    module: 'mail',
    type: 'mail',
    title: m.subject || '(no subject)',
    snippet: snippetAround(m.bodyText, q),
    user: userBrief(m.sender),
    date: m.sentAt || m.createdAt,
    meta: { isDraft: m.isDraft, isMine: m.senderId === user.id },
  }));

  return { items, total: sentTotal + receivedTotal };
}

async function searchDrive(user, q, { limit, offset }) {
  const like = `%${escapeLike(q)}%`;

  const shareRows = await DriveShare.findAll({ where: { sharedWithUserId: user.id }, attributes: ['itemId'] });
  const sharedItemIds = shareRows.map((s) => s.itemId);

  const where = {
    isTrashed: false,
    [Op.or]: [
      { ownerId: user.id },
      ...(sharedItemIds.length ? [{ id: { [Op.in]: sharedItemIds } }] : []),
    ],
    [Op.and]: [
      {
        [Op.or]: [
          { name: { [Op.like]: like } },
          { '$docContent.content$': { [Op.like]: like } },
        ],
      },
    ],
  };

  const include = [
    { model: User, as: 'owner', attributes: USER_BRIEF_ATTRS },
    { model: DocContent, as: 'docContent', attributes: ['content'], required: false },
  ];

  const [total, itemRows] = await Promise.all([
    DriveItem.count({ where, include, distinct: true, col: 'id', subQuery: false }),
    DriveItem.findAll({ where, include, order: [['updatedAt', 'DESC']], limit, offset, subQuery: false }),
  ]);

  const items = itemRows.map((item) => {
    const isMatchInName = item.name.toLowerCase().includes(q.toLowerCase());
    return {
      id: item.id,
      module: 'drive',
      type: item.type === 'FOLDER' ? 'folder' : 'file',
      title: item.name,
      snippet: isMatchInName ? '' : snippetAround(item.docContent?.content, q),
      user: userBrief(item.owner),
      date: item.updatedAt,
      meta: { parentId: item.parentId, mimeType: item.mimeType, itemType: item.type },
    };
  });

  return { items, total };
}

async function searchCalendar(user, q, { limit, offset }) {
  const like = `%${escapeLike(q)}%`;

  const attendeeRows = await CalendarEventAttendee.findAll({ where: { userId: user.id }, attributes: ['eventId'] });
  const invitedEventIds = attendeeRows.map((r) => r.eventId);

  const where = {
    isCancelled: false,
    [Op.and]: [
      { [Op.or]: [{ organizerId: user.id }, { id: { [Op.in]: invitedEventIds.length ? invitedEventIds : [''] } }] },
      {
        [Op.or]: [
          { title: { [Op.like]: like } },
          { description: { [Op.like]: like } },
          { location: { [Op.like]: like } },
        ],
      },
    ],
  };

  const include = [{ model: User, as: 'organizer', attributes: USER_BRIEF_ATTRS }];

  const [total, events] = await Promise.all([
    CalendarEvent.count({ where }),
    CalendarEvent.findAll({ where, include, order: [['startsAt', 'DESC']], limit, offset }),
  ]);

  const items = events.map((e) => ({
    id: e.id,
    module: 'calendar',
    type: 'event',
    title: e.title,
    snippet: snippetAround(e.description || e.location, q),
    user: userBrief(e.organizer),
    date: e.startsAt,
    meta: { endsAt: e.endsAt, location: e.location, isOrganizer: e.organizerId === user.id },
  }));

  return { items, total };
}

async function searchEmployees(user, q, { limit, offset }) {
  const like = `%${escapeLike(q)}%`;

  const where = {
    isActive: true,
    [Op.or]: [
      { firstName: { [Op.like]: like } },
      { lastName: { [Op.like]: like } },
      { email: { [Op.like]: like } },
      { department: { [Op.like]: like } },
      { '$EmployeeProfile.employee_code$': { [Op.like]: like } },
      { '$EmployeeProfile.designation$': { [Op.like]: like } },
    ],
  };

  const include = [{ model: EmployeeProfile, attributes: ['employeeCode', 'designation'], required: false }];

  const [total, users] = await Promise.all([
    User.count({ where, include, distinct: true, col: 'id', subQuery: false }),
    User.findAll({ where, include, order: [['firstName', 'ASC']], limit, offset, subQuery: false }),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    module: 'employees',
    type: 'employee',
    title: u.getFullName(),
    snippet: [u.EmployeeProfile?.designation, u.department, u.EmployeeProfile?.employeeCode].filter(Boolean).join(' · '),
    user: userBrief(u),
    date: null,
    meta: { department: u.department, employeeCode: u.EmployeeProfile?.employeeCode || null, role: u.role },
  }));

  return { items, total };
}

async function searchMeetings(user, q, { limit, offset }) {
  const like = `%${escapeLike(q)}%`;

  const memberships = await ChatConversationMember.findAll({
    where: { userId: user.id, leftAt: null },
    attributes: ['conversationId'],
  });
  const conversationIds = memberships.map((m) => m.conversationId);
  if (!conversationIds.length) return { items: [], total: 0 };

  const byTitleOrOrganizer = await ChatMeeting.findAll({
    where: {
      conversationId: { [Op.in]: conversationIds },
      [Op.or]: [{ title: { [Op.like]: like } }, { '$organizer.first_name$': { [Op.like]: like } }, { '$organizer.last_name$': { [Op.like]: like } }, { '$organizer.email$': { [Op.like]: like } }],
    },
    include: [{ model: User, as: 'organizer', attributes: USER_BRIEF_ATTRS }],
    subQuery: false,
  });

  const byParticipant = await ChatMeeting.findAll({
    where: { conversationId: { [Op.in]: conversationIds } },
    include: [
      { model: User, as: 'organizer', attributes: USER_BRIEF_ATTRS },
      {
        model: ChatConversation,
        as: 'conversation',
        attributes: [],
        required: true,
        include: [
          {
            model: ChatConversationMember,
            as: 'members',
            attributes: [],
            required: true,
            where: { leftAt: null },
            include: [
              {
                model: User,
                as: 'user',
                attributes: [],
                required: true,
                where: {
                  [Op.or]: [{ firstName: { [Op.like]: like } }, { lastName: { [Op.like]: like } }, { email: { [Op.like]: like } }],
                },
              },
            ],
          },
        ],
      },
    ],
    subQuery: false,
  });

  const seen = new Map();
  [...byTitleOrOrganizer, ...byParticipant].forEach((m) => {
    if (!seen.has(m.id)) seen.set(m.id, m);
  });
  const merged = [...seen.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = merged.length;
  const page = merged.slice(offset, offset + limit);

  const items = page.map((m) => ({
    id: m.id,
    module: 'meetings',
    type: 'meeting',
    title: m.title,
    snippet: `${m.status === 'ACTIVE' ? 'In progress' : m.status === 'SCHEDULED' ? 'Scheduled' : m.status === 'ENDED' ? 'Ended' : 'Cancelled'}${m.scheduledAt ? ` · ${new Date(m.scheduledAt).toLocaleString()}` : ''}`,
    user: userBrief(m.organizer),
    date: m.scheduledAt || m.createdAt,
    meta: { conversationId: m.conversationId, status: m.status, roomId: m.id },
  }));

  return { items, total };
}

const MODULE_SEARCHERS = {
  chat: searchChat,
  mail: searchMail,
  drive: searchDrive,
  calendar: searchCalendar,
  employees: searchEmployees,
  meetings: searchMeetings,
};

const MODULES = Object.keys(MODULE_SEARCHERS);

async function globalSearch(user, { q, perModuleLimit = 5 }) {
  const query = (q || '').trim();
  if (!query) {
    return { query, results: Object.fromEntries(MODULES.map((m) => [m, []])), counts: Object.fromEntries(MODULES.map((m) => [m, 0])), total: 0 };
  }

  const entries = await Promise.all(
    MODULES.map(async (moduleName) => {
      try {
        const { items, total } = await MODULE_SEARCHERS[moduleName](user, query, { limit: perModuleLimit, offset: 0 });
        return [moduleName, items, total];
      } catch (err) {
        console.error(`[search] ${moduleName} search failed:`, err.message);
        return [moduleName, [], 0];
      }
    })
  );

  const results = {};
  const counts = {};
  let total = 0;
  entries.forEach(([moduleName, items, count]) => {
    results[moduleName] = items;
    counts[moduleName] = count;
    total += count;
  });

  return { query, results, counts, total };
}

async function searchModule(user, moduleName, { q, page = 1, limit = 20 }) {
  const query = (q || '').trim();
  const searcher = MODULE_SEARCHERS[moduleName];
  if (!searcher) {
    const err = new Error(`Unknown search module: ${moduleName}`);
    err.status = 400;
    throw err;
  }
  if (!query) return { query, module: moduleName, results: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const offset = (page - 1) * limit;
  const { items, total } = await searcher(user, query, { limit, offset });

  return {
    query,
    module: moduleName,
    results: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { globalSearch, searchModule, searchEmployees, MODULES };