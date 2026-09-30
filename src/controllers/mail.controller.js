const asyncHandler = require('../utils/asyncHandler');
const mailService = require('../services/mail.service');

const listMail = asyncHandler(async (req, res) => {
  const { folder, search, page, pageSize } = req.query;
  const result = await mailService.listMail(req.user, { folder, search, page, pageSize });
  res.status(200).json(result);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await mailService.getUnreadCount(req.user);
  res.status(200).json(result);
});


const getContacts = asyncHandler(async (req, res) => {
  const result = await mailService.searchContacts(req.user, req.query.search);
  res.status(200).json({ contacts: result });
});

const getMessage = asyncHandler(async (req, res) => {
  const result = await mailService.getMessage(req.user, req.params.id);
  res.status(200).json(result);
});

const composeMessage = asyncHandler(async (req, res) => {
  const { to, cc, subject, bodyText, isDraft } = req.body;
  const result = await mailService.composeMessage(
    req.user,
    {
      to: Array.isArray(to) ? to : to ? [to] : [],
      cc: Array.isArray(cc) ? cc : cc ? [cc] : [],
      subject,
      bodyText,
      isDraft: isDraft === true || isDraft === 'true',
    },
    req.files || []
  );
  res.status(201).json(result);
});


const replyMessage = asyncHandler(async (req, res) => {
  const original = await mailService.getMessage(req.user, req.params.id);
  const { bodyText, isReplyAll } = req.body;

  const toIds = [original.from?.id].filter((id) => id && id !== req.user.id);
  const ccIds = isReplyAll
    ? [...(original.to || []), ...(original.cc || [])]
        .map((u) => u.id)
        .filter((id) => id && id !== req.user.id && !toIds.includes(id))
    : [];

  const subject = /^re:/i.test(original.subject || '') ? original.subject : `Re: ${original.subject || ''}`;

  const result = await mailService.composeMessage(
    req.user,
    { to: toIds, cc: ccIds, subject, bodyText, isDraft: false },
    req.files || []
  );
  res.status(201).json(result);
});


const forwardMessage = asyncHandler(async (req, res) => {
  const original = await mailService.getMessage(req.user, req.params.id);
  const { to, cc, bodyText } = req.body;

  const subject = /^fwd:/i.test(original.subject || '') ? original.subject : `Fwd: ${original.subject || ''}`;
  const composedBody = `${bodyText ? `${bodyText}\n\n` : ''}---------- Forwarded message ----------\n${original.bodyText || ''}`;

  const result = await mailService.composeMessage(
    req.user,
    {
      to: Array.isArray(to) ? to : to ? [to] : [],
      cc: Array.isArray(cc) ? cc : cc ? [cc] : [],
      subject,
      bodyText: composedBody,
      isDraft: false,
    },
    req.files || []
  );
  res.status(201).json(result);
});

const updateDraft = asyncHandler(async (req, res) => {
  const { to, cc, subject, bodyText, isDraft } = req.body;
  const result = await mailService.updateDraft(req.user, req.params.id, {
    to,
    cc,
    subject,
    bodyText,
    isDraft: isDraft === undefined ? undefined : isDraft === true || isDraft === 'true',
  });
  res.status(200).json(result);
});

const setFlags = asyncHandler(async (req, res) => {
  const { isRead, isStarred } = req.body;
  const result = await mailService.setFlags(req.user, req.params.id, { isRead, isStarred });
  res.status(200).json(result);
});

const trashOrDelete = asyncHandler(async (req, res) => {
  await mailService.trashOrDelete(req.user, req.params.id);
  res.status(204).send();
});

const restoreFromTrash = asyncHandler(async (req, res) => {
  const result = await mailService.restoreFromTrash(req.user, req.params.id);
  res.status(200).json(result);
});

const markAsSpam = asyncHandler(async (req, res) => {
  const result = await mailService.markAsSpam(req.user, req.params.id);
  res.status(200).json(result);
});

const markAsNotSpam = asyncHandler(async (req, res) => {
  const result = await mailService.markAsNotSpam(req.user, req.params.id);
  res.status(200).json(result);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const { path, fileName } = await mailService.getAttachmentDownloadInfo(req.user, req.params.attachmentId);
  res.download(path, fileName);
});

module.exports = {
  listMail,
  getUnreadCount,
  getContacts,
  getMessage,
  composeMessage,
  replyMessage,
  forwardMessage,
  updateDraft,
  setFlags,
  trashOrDelete,
  restoreFromTrash,
  markAsSpam,
  markAsNotSpam,
  downloadAttachment,
};