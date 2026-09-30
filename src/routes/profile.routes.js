const express = require('express');
const controller = require('../controllers/profile.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { handleProfilePictureUpload } = require('../middleware/upload');
const {
  updateBasicInfoValidators,
  updateProfileValidators,
  changePasswordValidators,
  educationValidators,
  skillValidators,
  experienceValidators,
  idParamValidator,
} = require('../validators/profile.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/me', controller.getMyProfile);
router.put('/basic-info', updateBasicInfoValidators, controller.updateBasicInfo);
router.put('/', updateProfileValidators, controller.updateProfile);
router.post('/picture', handleProfilePictureUpload, controller.uploadProfilePicture);
router.post('/change-password', changePasswordValidators, controller.changePassword);

router.post('/education', educationValidators, controller.addEducation);
router.put('/education/:id', idParamValidator, educationValidators, controller.updateEducation);
router.delete('/education/:id', idParamValidator, controller.deleteEducation);

router.post('/skills', skillValidators, controller.addSkill);
router.put('/skills/:id', idParamValidator, skillValidators, controller.updateSkill);
router.delete('/skills/:id', idParamValidator, controller.deleteSkill);

router.post('/experience', experienceValidators, controller.addExperience);
router.put('/experience/:id', idParamValidator, experienceValidators, controller.updateExperience);
router.delete('/experience/:id', idParamValidator, controller.deleteExperience);

module.exports = router;
