const sequelize = require('../config/db');

const User = require('./user.model');
const Task = require('./task.model');
const Attendance = require('./attendance.model');
const Document = require('./document.model');
const Holiday = require('./holiday.model');
const LeaveRequest = require('./leaveRequest.model');
const LeaveType = require('./leaveType.model');
const Notification = require('./notification.model');
const PasswordResetOtp = require('./passwordResetOtp.model');
const Payslip = require('./payslip.model');
const DemoRequest = require('./demoRequest.model');
const EmployeeProfile = require('./employeeProfile.model');
const EmployeeEducation = require('./employeeEducation.model');
const EmployeeExperience = require('./employeeExperience.model');
const EmployeeSkill = require('./employeeSkill.model');
const ChatConversation = require('./chatConversation.model');
const ChatConversationMember = require('./chatConversationMember.model');
const ChatMessage = require('./chatMessage.model');
const ChatMessageAttachment = require('./chatMessageAttachment.model');
const ChatMessageReaction = require('./chatMessageReaction.model');
const ChatMessageRead = require('./chatMessageRead.model');
const ChatMessageStar = require('./chatMessageStar.model');
const ChatPinnedMessage = require('./chatPinnedMessage.model');
const ChatPresence = require('./chatPresence.model');
const ChatSpace = require('./chatSpace.model');
const ChatSpaceMember = require('./chatSpaceMember.model');
const ChatMeeting = require('./chatMeeting.model');
const EmailMessage = require('./emailMessage.model');
const EmailRecipient = require('./emailRecipient.model');
const EmailAttachment = require('./emailAttachment.model');
const DriveItem = require('./driveItem.model');
const DriveShare = require('./driveShare.model');
const CalendarEvent = require('./calendarEvent.model');
const CalendarEventAttendee = require('./calendarEventAttendee.model');
const DocContent = require('./docContent.model');
const SheetContent = require('./sheetContent.model');
const SlideContent = require('./slideContent.model');
const MeetingParticipant = require('./meetingParticipant.model');
const CallRecord = require('./callRecord.model');
const EmployeeStatus = require('./employeeStatus.model');
const Group = require('./group.model');
const GroupMember = require('./groupMember.model');
const GroupMessage = require('./groupMessage.model');
const EmployeeSalaryStructure = require('./employeeSalaryStructure.model');
const PayrollRecord = require('./payrollRecord.model');
const PayrollEarning = require('./payrollEarning.model');
const PayrollDeduction = require('./payrollDeduction.model');
const PayrollAudit = require('./payrollAudit.model');
const SalarySlip = require('./salarySlip.model');


Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Task.belongsTo(User, { as: 'assigner', foreignKey: 'assignedBy' });
User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assignedTo' });
User.hasMany(Task, { as: 'createdTasks', foreignKey: 'assignedBy' });

Attendance.belongsTo(User, { as: 'employee', foreignKey: 'userId' });
User.hasMany(Attendance, { as: 'attendanceRecords', foreignKey: 'userId' });

Document.belongsTo(User, { as: 'owner', foreignKey: 'userId' });
Document.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy' });
Document.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewedBy' });
User.hasMany(Document, { as: 'documents', foreignKey: 'userId' });

LeaveRequest.belongsTo(User, { as: 'employee', foreignKey: 'userId' });
LeaveRequest.belongsTo(LeaveType, { as: 'leaveType', foreignKey: 'leaveTypeId' });
User.hasMany(LeaveRequest, { as: 'leaveRequests', foreignKey: 'userId' });
LeaveType.hasMany(LeaveRequest, { as: 'leaveRequests', foreignKey: 'leaveTypeId' });

Payslip.belongsTo(User, { as: 'employee', foreignKey: 'userId' });
User.hasMany(Payslip, { as: 'payslips', foreignKey: 'userId' });

EmployeeSalaryStructure.belongsTo(User, { as: 'employee', foreignKey: 'userId' });
User.hasMany(EmployeeSalaryStructure, { as: 'salaryStructures', foreignKey: 'userId' });

PayrollRecord.belongsTo(User, { as: 'employee', foreignKey: 'employeeId' });
User.hasMany(PayrollRecord, { as: 'payrollRecords', foreignKey: 'employeeId' });
PayrollRecord.belongsTo(EmployeeSalaryStructure, { as: 'salaryStructure', foreignKey: 'salaryStructureId' });

PayrollRecord.hasMany(PayrollEarning, { as: 'earningLines', foreignKey: 'payrollId' });
PayrollEarning.belongsTo(PayrollRecord, { as: 'payroll', foreignKey: 'payrollId' });

PayrollRecord.hasMany(PayrollDeduction, { as: 'deductionLines', foreignKey: 'payrollId' });
PayrollDeduction.belongsTo(PayrollRecord, { as: 'payroll', foreignKey: 'payrollId' });

PayrollRecord.hasMany(PayrollAudit, { as: 'auditTrail', foreignKey: 'payrollId' });
PayrollAudit.belongsTo(PayrollRecord, { as: 'payroll', foreignKey: 'payrollId' });

PayrollRecord.hasOne(Payslip, { as: 'payslip', foreignKey: 'payrollId' });
Payslip.belongsTo(PayrollRecord, { as: 'payroll', foreignKey: 'payrollId' });

PayrollRecord.hasOne(SalarySlip, { as: 'salarySlip', foreignKey: 'payrollId' });
SalarySlip.belongsTo(PayrollRecord, { as: 'payroll', foreignKey: 'payrollId' });

Notification.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Notification, { foreignKey: 'userId' });

EmployeeProfile.belongsTo(User, { foreignKey: 'userId' });
EmployeeProfile.belongsTo(User, { as: 'reportingManager', foreignKey: 'reportingManagerId' });
User.hasOne(EmployeeProfile, { foreignKey: 'userId' });

EmployeeEducation.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(EmployeeEducation, { as: 'education', foreignKey: 'userId' });

EmployeeExperience.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(EmployeeExperience, { as: 'experience', foreignKey: 'userId' });

EmployeeSkill.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(EmployeeSkill, { as: 'skills', foreignKey: 'userId' });

ChatConversation.hasMany(ChatConversationMember, { as: 'members', foreignKey: 'conversationId' });
ChatConversationMember.belongsTo(ChatConversation, { as: 'conversation', foreignKey: 'conversationId' });
ChatConversationMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(ChatConversationMember, { as: 'chatMemberships', foreignKey: 'userId' });

ChatConversation.hasMany(ChatMessage, { as: 'messages', foreignKey: 'conversationId' });
ChatMessage.belongsTo(ChatConversation, { as: 'conversation', foreignKey: 'conversationId' });
ChatMessage.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
User.hasMany(ChatMessage, { as: 'chatMessages', foreignKey: 'senderId' });

ChatMessage.belongsTo(ChatMessage, { as: 'replyToMessage', foreignKey: 'replyToMessageId' });
ChatMessage.hasMany(ChatMessage, { as: 'replies', foreignKey: 'replyToMessageId' });

ChatMessage.hasMany(ChatMessageAttachment, { as: 'attachments', foreignKey: 'messageId' });
ChatMessageAttachment.belongsTo(ChatMessage, { as: 'message', foreignKey: 'messageId' });

ChatMessage.hasMany(ChatMessageReaction, { as: 'reactions', foreignKey: 'messageId' });
ChatMessageReaction.belongsTo(ChatMessage, { as: 'message', foreignKey: 'messageId' });
ChatMessageReaction.belongsTo(User, { as: 'user', foreignKey: 'userId' });

ChatMessage.hasMany(ChatMessageRead, { as: 'reads', foreignKey: 'messageId' });
ChatMessageRead.belongsTo(ChatMessage, { as: 'message', foreignKey: 'messageId' });
ChatMessageRead.belongsTo(User, { as: 'user', foreignKey: 'userId' });

ChatMessage.hasMany(ChatMessageStar, { as: 'stars', foreignKey: 'messageId' });
ChatMessageStar.belongsTo(ChatMessage, { as: 'message', foreignKey: 'messageId' });
ChatMessageStar.belongsTo(User, { as: 'user', foreignKey: 'userId' });

ChatConversation.hasMany(ChatPinnedMessage, { as: 'pinnedMessages', foreignKey: 'conversationId' });
ChatPinnedMessage.belongsTo(ChatConversation, { as: 'conversation', foreignKey: 'conversationId' });
ChatPinnedMessage.belongsTo(ChatMessage, { as: 'message', foreignKey: 'messageId' });
ChatPinnedMessage.belongsTo(User, { as: 'pinnedByUser', foreignKey: 'pinnedBy' });

ChatPresence.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(ChatPresence, { as: 'chatPresence', foreignKey: 'userId' });

ChatConversation.hasOne(ChatSpace, { as: 'space', foreignKey: 'conversationId' });
ChatSpace.belongsTo(ChatConversation, { as: 'conversation', foreignKey: 'conversationId' });
ChatSpace.hasMany(ChatSpaceMember, { as: 'members', foreignKey: 'spaceId' });
ChatSpaceMember.belongsTo(ChatSpace, { as: 'space', foreignKey: 'spaceId' });
ChatSpaceMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(ChatSpaceMember, { as: 'spaceMemberships', foreignKey: 'userId' });

ChatConversation.hasMany(ChatMeeting, { as: 'meetings', foreignKey: 'conversationId' });
ChatMeeting.belongsTo(ChatConversation, { as: 'conversation', foreignKey: 'conversationId' });
ChatMeeting.belongsTo(User, { as: 'organizer', foreignKey: 'createdBy' });
ChatMessage.belongsTo(ChatMeeting, { as: 'meeting', foreignKey: 'meetingId' });

Group.hasMany(GroupMember, { as: 'members', foreignKey: 'groupId' });
GroupMember.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
GroupMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(GroupMember, { as: 'groupMemberships', foreignKey: 'userId' });

Group.hasMany(GroupMessage, { as: 'messages', foreignKey: 'groupId' });
GroupMessage.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
GroupMessage.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
User.hasMany(GroupMessage, { as: 'groupMessages', foreignKey: 'senderId' });

Group.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

EmailMessage.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
User.hasMany(EmailMessage, { as: 'sentEmails', foreignKey: 'senderId' });

EmailMessage.hasMany(EmailRecipient, { as: 'recipients', foreignKey: 'messageId' });
EmailRecipient.belongsTo(EmailMessage, { as: 'message', foreignKey: 'messageId' });
EmailRecipient.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(EmailRecipient, { as: 'emailInboxEntries', foreignKey: 'userId' });

EmailMessage.hasMany(EmailAttachment, { as: 'attachments', foreignKey: 'messageId' });
EmailAttachment.belongsTo(EmailMessage, { as: 'message', foreignKey: 'messageId' });

DriveItem.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(DriveItem, { as: 'driveItems', foreignKey: 'ownerId' });
DriveItem.belongsTo(DriveItem, { as: 'parent', foreignKey: 'parentId' });
DriveItem.hasMany(DriveItem, { as: 'children', foreignKey: 'parentId' });

DriveItem.hasMany(DriveShare, { as: 'shares', foreignKey: 'itemId' });
DriveShare.belongsTo(DriveItem, { as: 'item', foreignKey: 'itemId' });
DriveShare.belongsTo(User, { as: 'sharedWithUser', foreignKey: 'sharedWithUserId' });
DriveShare.belongsTo(User, { as: 'sharedByUser', foreignKey: 'sharedBy' });
User.hasMany(DriveShare, { as: 'receivedShares', foreignKey: 'sharedWithUserId' });

CalendarEvent.belongsTo(User, { as: 'organizer', foreignKey: 'organizerId' });
User.hasMany(CalendarEvent, { as: 'organizedEvents', foreignKey: 'organizerId' });
CalendarEvent.belongsTo(ChatMeeting, { as: 'meeting', foreignKey: 'meetingId' });

CalendarEvent.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
CalendarEvent.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });

CalendarEvent.hasMany(CalendarEventAttendee, { as: 'attendees', foreignKey: 'eventId' });
CalendarEventAttendee.belongsTo(CalendarEvent, { as: 'event', foreignKey: 'eventId' });
CalendarEventAttendee.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(CalendarEventAttendee, { as: 'eventInvites', foreignKey: 'userId' });

ChatMeeting.hasMany(MeetingParticipant, { as: 'participants', foreignKey: 'meetingId' });
MeetingParticipant.belongsTo(ChatMeeting, { as: 'meeting', foreignKey: 'meetingId' });
MeetingParticipant.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(MeetingParticipant, { as: 'meetingParticipations', foreignKey: 'userId' });

CallRecord.belongsTo(User, { as: 'caller', foreignKey: 'callerId' });
CallRecord.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
User.hasMany(CallRecord, { as: 'outgoingCalls', foreignKey: 'callerId' });
User.hasMany(CallRecord, { as: 'incomingCalls', foreignKey: 'receiverId' });

EmployeeStatus.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(EmployeeStatus, { as: 'statuses', foreignKey: 'userId' });

DriveItem.hasOne(DocContent, { as: 'docContent', foreignKey: 'itemId' });
DocContent.belongsTo(DriveItem, { as: 'item', foreignKey: 'itemId' });

DriveItem.hasOne(SheetContent, { as: 'sheetContent', foreignKey: 'itemId' });
SheetContent.belongsTo(DriveItem, { as: 'item', foreignKey: 'itemId' });

DriveItem.hasOne(SlideContent, { as: 'slideContent', foreignKey: 'itemId' });
SlideContent.belongsTo(DriveItem, { as: 'item', foreignKey: 'itemId' });

module.exports = {
  sequelize,
  User,
  Task,
  Attendance,
  Document,
  Holiday,
  LeaveRequest,
  LeaveType,
  Notification,
  PasswordResetOtp,
  Payslip,
  DemoRequest,
  EmployeeProfile,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeSkill,
  ChatConversation,
  ChatConversationMember,
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageReaction,
  ChatMessageRead,
  ChatMessageStar,
  ChatPinnedMessage,
  ChatPresence,
  ChatSpace,
  ChatSpaceMember,
  ChatMeeting,
  EmailMessage,
  EmailRecipient,
  EmailAttachment,
  DriveItem,
  DriveShare,
  CalendarEvent,
  CalendarEventAttendee,
  DocContent,
  SheetContent,
  SlideContent,
  MeetingParticipant,
  CallRecord,
  EmployeeStatus,
  Group,
  GroupMember,
  GroupMessage,
  EmployeeSalaryStructure,
  PayrollRecord,
  PayrollEarning,
  PayrollDeduction,
  PayrollAudit,
  SalarySlip,
};