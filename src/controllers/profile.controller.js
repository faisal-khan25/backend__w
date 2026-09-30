const asyncHandler = require('../utils/asyncHandler');
const profileService = require('../services/profile.service');

const getMyProfile = asyncHandler(async (req, res) => {
  const result = await profileService.getFullProfile(req.user.id);
  res.status(200).json(result);
});

const updateBasicInfo = asyncHandler(async (req, res) => {
  const result = await profileService.updateBasicInfo(req.user.id, req.body);
  res.status(200).json(result);
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await profileService.upsertProfile(req.user.id, req.body);
  res.status(200).json(result);
});

const uploadProfilePicture = asyncHandler(async (req, res) => {
  const result = await profileService.uploadProfilePicture(req.user.id, req.file);
  res.status(200).json(result);
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await profileService.changePassword(req.user.id, req.body);
  res.status(200).json(result);
});

const addEducation = asyncHandler(async (req, res) => {
  const result = await profileService.addEducation(req.user.id, req.body);
  res.status(201).json(result);
});

const updateEducation = asyncHandler(async (req, res) => {
  const result = await profileService.updateEducation(req.user.id, req.params.id, req.body);
  res.status(200).json(result);
});

const deleteEducation = asyncHandler(async (req, res) => {
  const result = await profileService.deleteEducation(req.user.id, req.params.id);
  res.status(200).json(result);
});

const addSkill = asyncHandler(async (req, res) => {
  const result = await profileService.addSkill(req.user.id, req.body);
  res.status(201).json(result);
});

const updateSkill = asyncHandler(async (req, res) => {
  const result = await profileService.updateSkill(req.user.id, req.params.id, req.body);
  res.status(200).json(result);
});

const deleteSkill = asyncHandler(async (req, res) => {
  const result = await profileService.deleteSkill(req.user.id, req.params.id);
  res.status(200).json(result);
});

const addExperience = asyncHandler(async (req, res) => {
  const result = await profileService.addExperience(req.user.id, req.body);
  res.status(201).json(result);
});

const updateExperience = asyncHandler(async (req, res) => {
  const result = await profileService.updateExperience(req.user.id, req.params.id, req.body);
  res.status(200).json(result);
});

const deleteExperience = asyncHandler(async (req, res) => {
  const result = await profileService.deleteExperience(req.user.id, req.params.id);
  res.status(200).json(result);
});

module.exports = {
  getMyProfile,
  updateBasicInfo,
  updateProfile,
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
