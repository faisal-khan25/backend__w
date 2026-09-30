const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const {
  User,
  EmployeeProfile,
  EmployeeEducation,
  EmployeeSkill,
  EmployeeExperience,
} = require('../models');
const ApiError = require('../utils/ApiError');
const toUserResponse = require('../utils/toUserResponse');

function toProfileResponse(profile) {
  if (!profile) return null;
  return {
    employeeCode: profile.employeeCode,
    designation: profile.designation,
    workType: profile.workType,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    bloodGroup: profile.bloodGroup,
    maritalStatus: profile.maritalStatus,
    personalEmail: profile.personalEmail,
    personalPhone: profile.personalPhone,
    workPhone: profile.workPhone,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    pincode: profile.pincode,
    dateOfJoining: profile.dateOfJoining,
    reportingManager: profile.reportingManager
      ? { id: profile.reportingManager.id, name: profile.reportingManager.getFullName() }
      : null,
    panNumber: profile.panNumber,
    aadhaarNumber: profile.aadhaarNumber,
    emergencyContact: {
      name: profile.emergencyContactName,
      relation: profile.emergencyContactRelation,
      phone: profile.emergencyContactPhone,
      address: profile.emergencyContactAddress,
    },
  };
}

function toEducationResponse(e) {
  return {
    id: e.id,
    degree: e.degree,
    institution: e.institution,
    fieldOfStudy: e.fieldOfStudy,
    startYear: e.startYear,
    endYear: e.endYear,
    grade: e.grade,
  };
}

function toSkillResponse(s) {
  return { id: s.id, skillName: s.skillName, proficiency: s.proficiency };
}

function toExperienceResponse(e) {
  return {
    id: e.id,
    companyName: e.companyName,
    designation: e.designation,
    startDate: e.startDate,
    endDate: e.endDate,
    isCurrent: e.isCurrent,
    description: e.description,
  };
}

async function generateEmployeeCode() {
  const count = await EmployeeProfile.count();
  return `EMP-${String(count + 1).padStart(5, '0')}`;
}

async function getFullProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.employeeNotFound();

  const [profile, education, skills, experience] = await Promise.all([
    EmployeeProfile.findByPk(userId, {
      include: [{ model: User, as: 'reportingManager', attributes: ['id', 'firstName', 'lastName'] }],
    }),
    EmployeeEducation.findAll({ where: { userId }, order: [['startYear', 'DESC']] }),
    EmployeeSkill.findAll({ where: { userId }, order: [['skillName', 'ASC']] }),
    EmployeeExperience.findAll({ where: { userId }, order: [['startDate', 'DESC']] }),
  ]);

  return {
    user: toUserResponse(user),
    profile: toProfileResponse(profile),
    education: education.map(toEducationResponse),
    skills: skills.map(toSkillResponse),
    experience: experience.map(toExperienceResponse),
  };
}

async function upsertProfile(userId, updates) {
  let profile = await EmployeeProfile.findByPk(userId);

  const fields = [
    'designation',
    'workType',
    'dateOfBirth',
    'gender',
    'bloodGroup',
    'maritalStatus',
    'personalEmail',
    'personalPhone',
    'workPhone',
    'addressLine1',
    'addressLine2',
    'city',
    'state',
    'country',
    'pincode',
    'panNumber',
    'aadhaarNumber',
  ];

  const values = {};
  fields.forEach((f) => {
    if (updates[f] !== undefined) values[f] = updates[f];
  });

  if (updates.emergencyContact) {
    const ec = updates.emergencyContact;
    if (ec.name !== undefined) values.emergencyContactName = ec.name;
    if (ec.relation !== undefined) values.emergencyContactRelation = ec.relation;
    if (ec.phone !== undefined) values.emergencyContactPhone = ec.phone;
    if (ec.address !== undefined) values.emergencyContactAddress = ec.address;
  }

  if (!profile) {
    profile = await EmployeeProfile.create({
      userId,
      employeeCode: await generateEmployeeCode(),
      dateOfJoining: new Date().toISOString().slice(0, 10),
      ...values,
    });
  } else {
    Object.assign(profile, values);
    await profile.save();
  }

  return getFullProfile(userId);
}

async function updateBasicInfo(userId, { firstName, lastName, department }) {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.employeeNotFound();

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (department !== undefined) user.department = department;

  await user.save();
  return toUserResponse(user);
}

async function uploadProfilePicture(userId, file) {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.employeeNotFound();

  if (user.profileImage) {
    const oldPath = path.join(__dirname, '..', '..', user.profileImage.replace(/^\/+/, ''));
    fs.unlink(oldPath, () => {});
  }

  const publicPath = `/uploads/profile-pictures/${file.filename}`;
  user.profileImage = publicPath;
  await user.save();

  return toUserResponse(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.employeeNotFound();
  if (!user.password) throw ApiError.noPasswordSet();

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) throw ApiError.currentPasswordIncorrect();

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  return { success: true, message: 'Password changed successfully' };
}

async function addEducation(userId, data) {
  const entry = await EmployeeEducation.create({ userId, ...data });
  return toEducationResponse(entry);
}

async function updateEducation(userId, id, data) {
  const entry = await EmployeeEducation.findOne({ where: { id, userId } });
  if (!entry) throw ApiError.educationEntryNotFound();
  Object.assign(entry, data);
  await entry.save();
  return toEducationResponse(entry);
}

async function deleteEducation(userId, id) {
  const deleted = await EmployeeEducation.destroy({ where: { id, userId } });
  if (!deleted) throw ApiError.educationEntryNotFound();
  return { success: true };
}

async function addSkill(userId, data) {
  const entry = await EmployeeSkill.create({ userId, ...data });
  return toSkillResponse(entry);
}

async function updateSkill(userId, id, data) {
  const entry = await EmployeeSkill.findOne({ where: { id, userId } });
  if (!entry) throw ApiError.skillNotFound();
  Object.assign(entry, data);
  await entry.save();
  return toSkillResponse(entry);
}

async function deleteSkill(userId, id) {
  const deleted = await EmployeeSkill.destroy({ where: { id, userId } });
  if (!deleted) throw ApiError.skillNotFound();
  return { success: true };
}

async function addExperience(userId, data) {
  const entry = await EmployeeExperience.create({ userId, ...data });
  return toExperienceResponse(entry);
}

async function updateExperience(userId, id, data) {
  const entry = await EmployeeExperience.findOne({ where: { id, userId } });
  if (!entry) throw ApiError.experienceEntryNotFound();
  Object.assign(entry, data);
  await entry.save();
  return toExperienceResponse(entry);
}

async function deleteExperience(userId, id) {
  const deleted = await EmployeeExperience.destroy({ where: { id, userId } });
  if (!deleted) throw ApiError.experienceEntryNotFound();
  return { success: true };
}

module.exports = {
  getFullProfile,
  upsertProfile,
  updateBasicInfo,
  uploadProfilePicture,
  changePassword,
  addEducation,
  updateEducation,
  deleteEducation,
  addSkill,
  updateSkill,
  deleteSkill,
  addExperience,
  updateExperience,
  deleteExperience,
};
