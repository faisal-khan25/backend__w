const asyncHandler = require('../utils/asyncHandler');
const groupService = require('../services/group.service');
const ApiError = require('../utils/ApiError');


const listMyGroups = asyncHandler(async (req, res) => {
  const groups = await groupService.listMyGroups(req.user, { search: req.query.search });
  
  res.status(200).json({
    groups,
    canCreateGroup: groupService.canCreateGroups(req.user),
  });
});

const createGroup = asyncHandler(async (req, res) => {
  const { name, description, icon, memberIds } = req.body;
  const group = await groupService.createGroup(req.user, {
    name,
    description,
    icon,
    memberIds,
  });
  res.status(201).json(group);
});

const getGroup = asyncHandler(async (req, res) => {
  const group = await groupService.getGroup(req.user, req.params.groupId);
  res.status(200).json(group);
});

const updateGroup = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;
  const group = await groupService.updateGroup(req.user, req.params.groupId, {
    name,
    description,
    icon,
  });
  res.status(200).json(group);
});

const deleteGroup = asyncHandler(async (req, res) => {
  const result = await groupService.deleteGroup(req.user, req.params.groupId);
  res.status(200).json(result);
});


const uploadGroupIcon = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.fileRequired();
  const iconPath = `/uploads/group-icons/${req.file.filename}`;
  const group = await groupService.updateGroup(req.user, req.params.groupId, {
    icon: iconPath,
  });
  res.status(200).json(group);
});



const listMembers = asyncHandler(async (req, res) => {
  const members = await groupService.listMembers(req.user, req.params.groupId, {
    includeInactive: req.query.includeInactive === 'true',
  });
  res.status(200).json({ members });
});

const addMembers = asyncHandler(async (req, res) => {
  const members = await groupService.addMembers(
    req.user,
    req.params.groupId,
    req.body.memberIds
  );
  res.status(201).json({ members });
});

const removeMember = asyncHandler(async (req, res) => {
  const members = await groupService.removeMember(
    req.user,
    req.params.groupId,
    req.params.userId
  );
  res.status(200).json({ members });
});

const changeMemberRole = asyncHandler(async (req, res) => {
  const members = await groupService.changeMemberRole(
    req.user,
    req.params.groupId,
    req.params.userId,
    req.body.role
  );
  res.status(200).json({ members });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const result = await groupService.leaveGroup(req.user, req.params.groupId);
  res.status(200).json(result);
});



const listMessages = asyncHandler(async (req, res) => {
  const result = await groupService.listMessages(req.user, req.params.groupId, {
    before: req.query.before,
    limit: req.query.limit,
  });
  res.status(200).json(result);
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await groupService.sendMessage(req.user, req.params.groupId, {
    message: req.body.message,
    messageType: req.body.messageType,
  });
  res.status(201).json(message);
});


const sendAttachmentMessage = asyncHandler(async (req, res) => {
  const message = await groupService.sendAttachmentMessage(
    req.user,
    req.params.groupId,
    req.file,
    { caption: req.body.caption }
  );
  res.status(201).json(message);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const { path: filePath, fileName } = await groupService.getAttachmentDownloadInfo(
    req.user,
    req.params.groupId,
    req.params.messageId
  );
  res.download(filePath, fileName);
});

const markGroupRead = asyncHandler(async (req, res) => {
  const result = await groupService.markGroupRead(req.user, req.params.groupId);
  res.status(200).json(result);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const result = await groupService.deleteMessage(req.user, req.params.messageId);
  res.status(200).json(result);
});

const searchMessages = asyncHandler(async (req, res) => {
  const result = await groupService.searchMessages(req.user, {
    q: req.query.q,
    groupId: req.query.groupId,
  });
  res.status(200).json(result);
});



const searchPeople = asyncHandler(async (req, res) => {
  const result = await groupService.searchPeople(req.user, req.query.q, {
    groupId: req.query.groupId,
  });
  res.status(200).json(result);
});

module.exports = {
  listMyGroups,
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup,
  uploadGroupIcon,
  listMembers,
  addMembers,
  removeMember,
  changeMemberRole,
  leaveGroup,
  listMessages,
  sendMessage,
  sendAttachmentMessage,
  downloadAttachment,
  markGroupRead,
  deleteMessage,
  searchMessages,
  searchPeople,
};
