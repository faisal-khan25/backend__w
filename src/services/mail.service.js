const fs = require('fs');
const { Op } = require('sequelize');
const { EmailMessage, EmailRecipient, EmailAttachment, User } = require('../models');
const ApiError = require('../utils/ApiError');
const toUserResponse = require('../utils/toUserResponse');
const notificationService = require('./notification.service');

const RECIPIENT_INCLUDE = {
  model: EmailRecipient,
  as: 'recipients',
  include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'] }],
};
const ATTACHMENT_INCLUDE = { model: EmailAttachment, as: 'attachments' };
const SENDER_INCLUDE = { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'] };

function toAttachmentResponse(a) {
  return { id: a.id, fileName: a.fileName, mimeType: a.mimeType, fileSize: a.fileSize };
}

function toMessageResponse(message, viewerId) {
  const isSender = message.senderId === viewerId;
  const myRecipientEntry = !isSender
    ? (message.recipients || []).find((r) => r.userId === viewerId)
    : null;

  const to = (message.recipients || []).filter((r) => r.type === 'TO');
  const cc = (message.recipients || []).filter((r) => r.type === 'CC');

  return {
    id: message.id,
    subject: message.subject,
    bodyText: message.bodyText,
    isDraft: message.isDraft,
    sentAt: message.sentAt,
    createdAt: message.createdAt,
    from: message.sender ? toUserResponse(message.sender) : undefined,
    to: to.map((r) => (r.user ? toUserResponse(r.user) : null)).filter(Boolean),
    cc: cc.map((r) => (r.user ? toUserResponse(r.user) : null)).filter(Boolean),
    attachments: (message.attachments || []).map(toAttachmentResponse),
    isRead: isSender ? true : Boolean(myRecipientEntry?.isRead),
    isStarred: isSender ? message.senderStarred : Boolean(myRecipientEntry?.isStarred),
    isTrashed: isSender ? message.senderTrashed : Boolean(myRecipientEntry?.isTrashed),
    isSpam: isSender ? false : Boolean(myRecipientEntry?.isSpam),
    isMine: isSender,
  };
}

async function findUsersByIdentifiers(identifiers) {
  if (!identifiers.length) return [];

  const flat = identifiers
    .flatMap((v) => (typeof v === 'string' && v.includes(',') ? v.split(',') : [v]))
    .map((v) => (typeof v === 'string' ? v.trim() : v))
    .filter(Boolean);

  if (!flat.length) return [];

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ids = flat.filter((v) => UUID_RE.test(v));
  const emails = flat.filter((v) => !UUID_RE.test(v));

  const where = { isActive: true };
  if (ids.length && emails.length) {
    where[Op.or] = [{ id: { [Op.in]: ids } }, { email: { [Op.in]: emails } }];
  } else if (ids.length) {
    where.id = { [Op.in]: ids };
  } else {
    where.email = { [Op.in]: emails };
  }

  const users = await User.findAll({ where });

  const foundIds = new Set(users.map((u) => u.id));
  const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const unresolved = flat.filter((v) => {
    if (UUID_RE.test(v)) return !foundIds.has(v);
    return !foundEmails.has(v.toLowerCase());
  });

  if (unresolved.length) {
    throw new ApiError(
      400,
      `The following recipients could not be found or are inactive: ${unresolved.join(', ')}`
    );
  }

  return users;
}

async function listMail(user, { folder = 'inbox', search, page = 1, pageSize = 25 } = {}) {
  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;
  const searchClause = search
    ? { [Op.or]: [{ subject: { [Op.like]: `%${search}%` } }, { bodyText: { [Op.like]: `%${search}%` } }] }
    : {};

  const include = [SENDER_INCLUDE, RECIPIENT_INCLUDE, ATTACHMENT_INCLUDE];

  let rows = [];
  let count = 0;

  if (folder === 'sent') {
    const where = { senderId: user.id, isDraft: false, senderTrashed: false, ...searchClause };
    const result = await EmailMessage.findAndCountAll({ where, include, order: [['sentAt', 'DESC']], limit, offset, distinct: true });
    rows = result.rows;
    count = result.count;
  } else if (folder === 'drafts') {
    const where = { senderId: user.id, isDraft: true, senderTrashed: false, ...searchClause };
    const result = await EmailMessage.findAndCountAll({ where, include, order: [['updatedAt', 'DESC']], limit, offset, distinct: true });
    rows = result.rows;
    count = result.count;
  } else if (folder === 'inbox') {
    const recipientWhere = { userId: user.id, isTrashed: false, isSpam: false };
    const result = await EmailRecipient.findAndCountAll({
      where: recipientWhere,
      include: [{ model: EmailMessage, as: 'message', where: { isDraft: false, ...searchClause }, include: [SENDER_INCLUDE, RECIPIENT_INCLUDE, ATTACHMENT_INCLUDE] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });
    rows = result.rows.map((r) => r.message);
    count = result.count;
  } else if (folder === 'spam') {
    const recipientWhere = { userId: user.id, isSpam: true, isTrashed: false };
    const result = await EmailRecipient.findAndCountAll({
      where: recipientWhere,
      include: [{ model: EmailMessage, as: 'message', where: { isDraft: false, ...searchClause }, include: [SENDER_INCLUDE, RECIPIENT_INCLUDE, ATTACHMENT_INCLUDE] }],
      order: [['spamAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });
    rows = result.rows.map((r) => r.message);
    count = result.count;
  } else if (folder === 'starred') {
    const [sentStarred, recvStarred] = await Promise.all([
      EmailMessage.findAll({ where: { senderId: user.id, senderStarred: true, senderTrashed: false, isDraft: false, ...searchClause }, include }),
      EmailRecipient.findAll({
        where: { userId: user.id, isStarred: true, isTrashed: false, isSpam: false },
        include: [{ model: EmailMessage, as: 'message', where: { isDraft: false, ...searchClause }, include }],
      }),
    ]);
    const merged = [...sentStarred, ...recvStarred.map((r) => r.message)];
    merged.sort((a, b) => new Date(b.sentAt || b.createdAt) - new Date(a.sentAt || a.createdAt));
    count = merged.length;
    rows = merged.slice(offset, offset + limit);
  } else if (folder === 'trash') {
    const [sentTrashed, recvTrashed] = await Promise.all([
      EmailMessage.findAll({ where: { senderId: user.id, senderTrashed: true, ...searchClause }, include }),
      EmailRecipient.findAll({
        where: { userId: user.id, isTrashed: true },
        include: [{ model: EmailMessage, as: 'message', where: searchClause, include }],
      }),
    ]);
    const merged = [...sentTrashed, ...recvTrashed.map((r) => r.message)];
    merged.sort((a, b) => new Date(b.sentAt || b.createdAt) - new Date(a.sentAt || a.createdAt));
    count = merged.length;
    rows = merged.slice(offset, offset + limit);
  } else {
    throw new ApiError(400, 'folder must be one of: inbox, sent, drafts, starred, spam, trash');
  }

  return {
    messages: rows.map((m) => toMessageResponse(m, user.id)),
    pagination: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit) || 0 },
  };
}

async function getUnreadCount(user) {
  const count = await EmailRecipient.count({ where: { userId: user.id, isRead: false, isTrashed: false, isSpam: false } });
  return { unreadCount: count };
}

async function searchContacts(user, query) {
  const { Op } = require('sequelize');
  if (!query || !query.trim()) {
    const recent = await EmailRecipient.findAll({
      attributes: ['userId'],
      include: [{
        model: EmailMessage,
        as: 'message',
        attributes: [],
        where: { senderId: user.id, isDraft: false },
      }],
      where: { userId: { [Op.ne]: user.id } },
      order: [['createdAt', 'DESC']],
      limit: 10,
      group: ['userId'],
    });
    const recentIds = recent.map((r) => r.userId);
    if (!recentIds.length) return [];
    const users = await User.findAll({
      where: { id: { [Op.in]: recentIds }, isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage', 'department'],
    });
    return users.map(toUserResponse);
  }

  const term = query.trim();
  const users = await User.findAll({
    where: {
      isActive: true,
      id: { [Op.ne]: user.id },
      [Op.or]: [
        { firstName: { [Op.like]: `%${term}%` } },
        { lastName: { [Op.like]: `%${term}%` } },
        { email: { [Op.like]: `%${term}%` } },
      ],
    },
    attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage', 'department'],
    order: [['firstName', 'ASC']],
    limit: 10,
  });
  return users.map(toUserResponse);
}

async function loadMessageForViewer(user, id) {
  const message = await EmailMessage.findByPk(id, {
    include: [SENDER_INCLUDE, RECIPIENT_INCLUDE, ATTACHMENT_INCLUDE],
  });
  if (!message) throw ApiError.emailNotFound();

  const isSender = message.senderId === user.id;
  const isRecipient = (message.recipients || []).some((r) => r.userId === user.id);
  if (!isSender && !isRecipient) throw ApiError.emailNotFound();

  return message;
}

async function getMessage(user, id) {
  const message = await loadMessageForViewer(user, id);

  const myEntry = (message.recipients || []).find((r) => r.userId === user.id);
  if (myEntry && !myEntry.isRead) {
    myEntry.isRead = true;
    await myEntry.save();
  }

  return toMessageResponse(message, user.id);
}

async function composeMessage(user, { to = [], cc = [], subject, bodyText, isDraft = false }, files = []) {
  if (!isDraft) {
    if (!to.length) throw ApiError.recipientsRequired();
  }

  const toUsers = await findUsersByIdentifiers(to);
  const ccUsers = await findUsersByIdentifiers(cc);

  const message = await EmailMessage.create({
    senderId: user.id,
    subject: subject || '(no subject)',
    bodyText: bodyText || '',
    isDraft,
    sentAt: isDraft ? null : new Date(),
  });

  const recipientRows = [
    ...toUsers.map((u) => ({ messageId: message.id, userId: u.id, type: 'TO' })),
    ...ccUsers.map((u) => ({ messageId: message.id, userId: u.id, type: 'CC' })),
  ];
  if (recipientRows.length) await EmailRecipient.bulkCreate(recipientRows);

  if (files.length) {
    await EmailAttachment.bulkCreate(
      files.map((f) => ({
        messageId: message.id,
        fileName: f.originalname,
        storagePath: f.path,
        mimeType: f.mimetype,
        fileSize: f.size,
      }))
    );
  }

  if (!isDraft) {
    const recipientIds = [...toUsers, ...ccUsers].map((u) => u.id);
    await notificationService.notifyUsers(recipientIds, {
      type: 'EMAIL',
      title: 'New email',
      message: `${user.getFullName()} sent you an email: "${message.subject}".`,
      referenceId: message.id,
      referenceType: 'EMAIL',
    });
  }

  return loadMessageForViewer(user, message.id).then((m) => toMessageResponse(m, user.id));
}

async function updateDraft(user, id, { to, cc, subject, bodyText, isDraft }) {
  const message = await EmailMessage.findByPk(id);
  if (!message || message.senderId !== user.id) throw ApiError.emailNotFound();
  if (!message.isDraft) throw new ApiError(409, 'Only drafts can be edited');

  if (subject !== undefined) message.subject = subject;
  if (bodyText !== undefined) message.bodyText = bodyText;

  if (to !== undefined || cc !== undefined) {
    await EmailRecipient.destroy({ where: { messageId: message.id } });
    const toUsers = await findUsersByIdentifiers(to || []);
    const ccUsers = await findUsersByIdentifiers(cc || []);
    const rows = [
      ...toUsers.map((u) => ({ messageId: message.id, userId: u.id, type: 'TO' })),
      ...ccUsers.map((u) => ({ messageId: message.id, userId: u.id, type: 'CC' })),
    ];
    if (rows.length) await EmailRecipient.bulkCreate(rows);
  }

  const sending = isDraft === false;
  if (sending) {
    const recipientCount = await EmailRecipient.count({ where: { messageId: message.id } });
    if (!recipientCount) throw ApiError.recipientsRequired();
    message.isDraft = false;
    message.sentAt = new Date();
  }
  await message.save();

  if (sending) {
    const recipients = await EmailRecipient.findAll({ where: { messageId: message.id } });
    await notificationService.notifyUsers(recipients.map((r) => r.userId), {
      type: 'EMAIL',
      title: 'New email',
      message: `${user.getFullName()} sent you an email: "${message.subject}".`,
      referenceId: message.id,
      referenceType: 'EMAIL',
    });
  }

  return loadMessageForViewer(user, message.id).then((m) => toMessageResponse(m, user.id));
}

async function setFlags(user, id, { isRead, isStarred }) {
  const message = await loadMessageForViewer(user, id);
  const isSender = message.senderId === user.id;

  if (isSender) {
    if (isStarred !== undefined) message.senderStarred = isStarred;
    await message.save();
  } else {
    const entry = (message.recipients || []).find((r) => r.userId === user.id);
    if (!entry) throw ApiError.emailNotFound();
    if (isRead !== undefined) entry.isRead = isRead;
    if (isStarred !== undefined) entry.isStarred = isStarred;
    await entry.save();
  }

  return toMessageResponse(message, user.id);
}

async function trashOrDelete(user, id) {
  const message = await loadMessageForViewer(user, id);
  const isSender = message.senderId === user.id;

  if (isSender) {
    if (message.senderTrashed) {
      const remaining = await EmailRecipient.count({ where: { messageId: message.id } });
      if (remaining === 0) {
        const attachments = await EmailAttachment.findAll({ where: { messageId: message.id } });
        await Promise.all(attachments.map((a) => fs.promises.unlink(a.storagePath).catch(() => {})));
        await EmailAttachment.destroy({ where: { messageId: message.id } });
        await message.destroy();
      } else {
        message.senderTrashed = true;
        await message.save();
      }
    } else {
      message.senderTrashed = true;
      message.senderTrashedAt = new Date();
      await message.save();
    }
  } else {
    const entry = (message.recipients || []).find((r) => r.userId === user.id);
    if (!entry) throw ApiError.emailNotFound();
    if (entry.isTrashed) {
      await entry.destroy();
    } else {
      entry.isTrashed = true;
      entry.trashedAt = new Date();
      await entry.save();
    }
  }
}

async function restoreFromTrash(user, id) {
  const message = await loadMessageForViewer(user, id);
  const isSender = message.senderId === user.id;

  if (isSender) {
    message.senderTrashed = false;
    message.senderTrashedAt = null;
    await message.save();
  } else {
    const entry = (message.recipients || []).find((r) => r.userId === user.id);
    if (!entry) throw ApiError.emailNotFound();
    entry.isTrashed = false;
    entry.trashedAt = null;
    await entry.save();
  }

  return toMessageResponse(message, user.id);
}

async function markAsSpam(user, id) {
  const message = await loadMessageForViewer(user, id);
  const isSender = message.senderId === user.id;
  if (isSender) throw ApiError.cannotSpamOwnEmail();

  const entry = (message.recipients || []).find((r) => r.userId === user.id);
  if (!entry) throw ApiError.emailNotFound();
  if (!entry.isSpam) {
    entry.isSpam = true;
    entry.spamAt = new Date();
    await entry.save();
  }

  return toMessageResponse(message, user.id);
}

async function markAsNotSpam(user, id) {
  const message = await loadMessageForViewer(user, id);
  const isSender = message.senderId === user.id;
  if (isSender) throw ApiError.cannotSpamOwnEmail();

  const entry = (message.recipients || []).find((r) => r.userId === user.id);
  if (!entry) throw ApiError.emailNotFound();
  if (entry.isSpam) {
    entry.isSpam = false;
    entry.spamAt = null;
    await entry.save();
  }

  return toMessageResponse(message, user.id);
}

async function getAttachmentDownloadInfo(user, attachmentId) {
  const attachment = await EmailAttachment.findByPk(attachmentId, {
    include: [{ model: EmailMessage, as: 'message', include: [RECIPIENT_INCLUDE] }],
  });
  if (!attachment) throw ApiError.emailAttachmentNotFound();

  const message = attachment.message;
  const isSender = message.senderId === user.id;
  const isRecipient = (message.recipients || []).some((r) => r.userId === user.id);
  if (!isSender && !isRecipient) throw ApiError.emailAttachmentNotFound();
  if (!fs.existsSync(attachment.storagePath)) throw ApiError.emailAttachmentNotFound();

  return { path: attachment.storagePath, fileName: attachment.fileName, mimeType: attachment.mimeType };
}

module.exports = {
  listMail,
  getUnreadCount,
  searchContacts,
  getMessage,
  composeMessage,
  updateDraft,
  setFlags,
  trashOrDelete,
  restoreFromTrash,
  markAsSpam,
  markAsNotSpam,
  getAttachmentDownloadInfo,
};