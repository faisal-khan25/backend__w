class ApiError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

ApiError.emailAlreadyExists = () =>
  new ApiError(409, 'An account with this email already exists');

ApiError.invalidCredentials = () =>
  new ApiError(401, 'Invalid email or password');

ApiError.accountInactive = () =>
  new ApiError(403, 'Your account is inactive. Please contact HR or your administrator.');

ApiError.invalidOtp = (message) =>
  new ApiError(400, message || 'Invalid verification code');

ApiError.otpExpired = () =>
  new ApiError(400, 'OTP has expired. Please request a new one');

ApiError.rateLimited = (message) => new ApiError(429, message);

ApiError.tooManyAttempts = () =>
  new ApiError(429, 'Maximum verification attempts exceeded. Please request a new OTP');

ApiError.userNotFound = () =>
  new ApiError(404, 'No account found for this email');

ApiError.passwordMismatch = () =>
  new ApiError(400, 'Passwords do not match');

ApiError.invalidToken = (message) =>
  new ApiError(401, message || 'Invalid token');

ApiError.alreadyPunchedIn = () =>
  new ApiError(409, 'You have already punched in today');

ApiError.notPunchedIn = () =>
  new ApiError(409, 'You need to punch in before you can punch out');

ApiError.alreadyPunchedOut = () =>
  new ApiError(409, 'You have already punched out today');

ApiError.invalidLeaveType = () => new ApiError(400, 'Unknown leave type');

ApiError.invalidDateRange = () =>
  new ApiError(400, '"To date" must be on or after "From date"');

ApiError.insufficientLeaveBalance = (remaining) =>
  new ApiError(400, `Insufficient leave balance. ${remaining} day(s) remaining for this leave type`);

ApiError.leaveRequestNotFound = () => new ApiError(404, 'Leave request not found');

ApiError.leaveNotCancellable = () =>
  new ApiError(409, 'Only pending leave requests can be cancelled');

ApiError.employeeNotFound = () => new ApiError(404, 'Employee not found');

ApiError.cannotDeactivateSelf = () =>
  new ApiError(400, 'You cannot deactivate your own account');

ApiError.taskNotFound = () => new ApiError(404, 'Task not found');

ApiError.noAssigneesProvided = () =>
  new ApiError(400, 'At least one employee must be selected to assign this task');

ApiError.invalidAssignee = (name) =>
  new ApiError(400, `${name || 'One or more selected employees'} could not be found or is inactive`);

ApiError.taskFieldNotEditableByEmployee = () =>
  new ApiError(403, 'Only status, progress, and comments can be updated on a task assigned to you');

ApiError.taskNotDeletableByEmployee = () =>
  new ApiError(403, 'Only tasks you created yourself can be deleted. Ask your admin to cancel this task.');

ApiError.documentNotFound = () => new ApiError(404, 'Document not found');

ApiError.fileRequired = () => new ApiError(400, 'A file is required');

ApiError.fileTooLarge = () =>
  new ApiError(400, 'File is too large. Maximum size is 10MB');

ApiError.unsupportedFileType = () =>
  new ApiError(400, 'Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX');

ApiError.documentAlreadyReviewed = () =>
  new ApiError(409, 'This document has already been reviewed');

ApiError.rejectionReasonRequired = () =>
  new ApiError(400, 'A rejection reason is required when rejecting a document');

ApiError.notificationNotFound = () => new ApiError(404, 'Notification not found');

ApiError.payslipNotFound = () => new ApiError(404, 'Payslip not found');

ApiError.payslipAlreadyExists = () =>
  new ApiError(409, 'A payslip for this employee and pay period already exists');

ApiError.salaryStructureNotFound = () => new ApiError(404, 'No salary structure found for this employee');

ApiError.salaryStructureRequired = () =>
  new ApiError(
    400,
    'This employee has no active salary structure. Add one before running payroll for them.'
  );

ApiError.invalidEffectiveDateRange = () =>
  new ApiError(400, '"Effective To" must be on or after "Effective From"');

ApiError.payrollNotFound = () => new ApiError(404, 'Payroll record not found');

ApiError.payrollAlreadyExists = () =>
  new ApiError(409, 'A payroll record for this employee and pay period already exists');

ApiError.payrollLocked = () =>
  new ApiError(409, 'This payroll record has been finalized and can no longer be edited');

ApiError.invalidPayrollTransition = (from, to) =>
  new ApiError(409, `Payroll cannot move from ${from} to ${to}`);

ApiError.overrideReasonRequired = () =>
  new ApiError(400, 'An override reason is required when manually changing the gross salary');

ApiError.invalidPayrollInput = (message) => new ApiError(400, message);

ApiError.deductionsExceedEarnings = (shortfall) =>
  new ApiError(
    422,
    `Total deductions exceed gross salary by ₹${Number(shortfall).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}. Reduce the deductions so that Net Salary is not negative.`
  );

ApiError.payslipNotYetGenerated = () =>
  new ApiError(404, 'A payslip has not been generated for this payroll yet');

ApiError.paymentReferenceRequiredForOverride = () => new ApiError(400, 'Payment reference is required');

ApiError.salarySlipForbidden = () =>
  new ApiError(403, 'You do not have permission to view this salary slip');

ApiError.salarySlipNotAvailable = (status) =>
  new ApiError(409, `A salary slip is only available once payroll is finalized (current status: ${status})`);

ApiError.salaryDataMissing = () =>
  new ApiError(422, 'This payroll record has no salary data, so a salary slip cannot be generated');

ApiError.conversationNotFound = () => new ApiError(404, 'Conversation not found');

ApiError.notConversationMember = () =>
  new ApiError(403, 'You are not a member of this conversation');

ApiError.messageNotFound = () => new ApiError(404, 'Message not found');

ApiError.messageNotEditable = () =>
  new ApiError(403, 'You can only edit your own messages');

ApiError.messageNotDeletable = () =>
  new ApiError(403, 'You can only delete your own messages');

ApiError.duplicateReaction = () =>
  new ApiError(409, "You've already reacted with this emoji");

ApiError.reactionNotFound = () => new ApiError(404, 'Reaction not found');

ApiError.chatUserNotFound = () => new ApiError(404, 'One or more selected users could not be found or are inactive');

ApiError.groupNameRequired = () => new ApiError(400, 'A group name is required');

ApiError.notGroupOrSpaceAdmin = () =>
  new ApiError(403, 'Only a group/space admin can perform this action');

ApiError.cannotRemoveLastAdmin = () =>
  new ApiError(409, 'A group/space must always have at least one admin');

ApiError.spaceNotFound = () => new ApiError(404, 'Space not found');

ApiError.notSpaceMember = () => new ApiError(403, 'You are not a member of this space');

ApiError.attachmentNotFound = () => new ApiError(404, 'Attachment not found');

ApiError.attachmentTooLarge = () =>
  new ApiError(400, 'File is too large. Maximum size is 25MB');

ApiError.unsupportedAttachmentType = () =>
  new ApiError(400, 'Unsupported file type for chat attachments');

ApiError.statusNotFound = () => new ApiError(404, 'Status not found');

ApiError.invalidStatusTimeRange = () =>
  new ApiError(400, '"End time" must be after "Start time"');

ApiError.statusCustomMessageRequired = () =>
  new ApiError(400, 'A custom message is required for a custom status');

ApiError.statusEndTimeInPast = () =>
  new ApiError(400, 'End time must be in the future');

ApiError.emailNotFound = () => new ApiError(404, 'Email not found');

ApiError.recipientsRequired = () =>
  new ApiError(400, 'At least one recipient is required');

ApiError.invalidRecipient = (name) =>
  new ApiError(400, `${name || 'One or more recipients'} could not be found or is inactive`);

ApiError.emailAttachmentNotFound = () => new ApiError(404, 'Attachment not found');

ApiError.emailAttachmentTooLarge = () =>
  new ApiError(400, 'File is too large. Maximum size is 25MB');

ApiError.cannotSpamOwnEmail = () =>
  new ApiError(400, 'You cannot mark an email you sent as spam');

ApiError.driveItemNotFound = () => new ApiError(404, 'File or folder not found');

ApiError.driveFolderNotFound = () => new ApiError(404, 'Destination folder not found');

ApiError.driveNameRequired = () => new ApiError(400, 'A name is required');

ApiError.driveNotOwner = () =>
  new ApiError(403, 'Only the owner can perform this action');

ApiError.driveNoPermission = () =>
  new ApiError(403, 'You do not have permission to access this file or folder');

ApiError.driveCannotMoveIntoSelf = () =>
  new ApiError(400, 'A folder cannot be moved into itself or one of its own subfolders');

ApiError.driveFileTooLarge = () =>
  new ApiError(400, 'File is too large. Maximum size is 100MB');

ApiError.driveShareTargetIsOwner = () =>
  new ApiError(400, 'This file is already owned by that user');

ApiError.calendarEventNotFound = () => new ApiError(404, 'Event not found');

ApiError.calendarEventTitleRequired = () => new ApiError(400, 'A title is required');

ApiError.calendarInvalidDateRange = () =>
  new ApiError(400, 'Event end time must be after the start time');

ApiError.calendarNotOrganizer = () =>
  new ApiError(403, 'Only the organizer can perform this action');

ApiError.calendarNotInvited = () =>
  new ApiError(403, 'You were not invited to this event');

ApiError.calendarForbiddenEventType = (message) =>
  new ApiError(403, message || 'You are not allowed to create this type of event');

ApiError.calendarForbiddenVisibility = (message) =>
  new ApiError(403, message || 'You are not allowed to set this visibility');

ApiError.calendarForbiddenParticipant = (message) =>
  new ApiError(403, message || 'You are not allowed to invite one or more of these people');

ApiError.calendarNotEditable = () =>
  new ApiError(403, 'You do not have permission to edit this event');

ApiError.calendarParticipantNotFound = () =>
  new ApiError(404, 'Participant not found on this event');

ApiError.groupNotFound = () => new ApiError(404, 'Group not found');

ApiError.groupInvalidId = () => new ApiError(400, 'A valid group ID is required');

ApiError.groupNameRequired = () => new ApiError(400, 'Group name is required');

ApiError.groupNotMember = () =>
  new ApiError(403, 'You are not a member of this group');

ApiError.groupNotAdmin = () =>
  new ApiError(403, 'Only a group admin can perform this action');

ApiError.groupMemberNotFound = () =>
  new ApiError(404, 'That user is not a member of this group');

ApiError.groupDuplicateMember = (name) =>
  new ApiError(409, `${name || 'That user'} is already a member of this group`);

ApiError.groupUserNotFound = () =>
  new ApiError(404, 'One or more selected users could not be found or are inactive');

ApiError.groupMessageEmpty = () =>
  new ApiError(400, 'Message cannot be empty');

ApiError.groupLastAdmin = () =>
  new ApiError(409, 'You are the only admin. Promote another member to admin first.');

ApiError.groupCannotRemoveSelf = () =>
  new ApiError(400, 'Use "Leave group" to remove yourself');

ApiError.groupCreateForbidden = () =>
  new ApiError(403, 'Only an admin or a manager can create groups');

ApiError.groupAttachmentNotFound = () =>
  new ApiError(404, 'Attachment not found');

ApiError.reportScopeForbidden = () =>
  new ApiError(403, 'You do not have permission to view reports for this employee or department');

module.exports = ApiError;