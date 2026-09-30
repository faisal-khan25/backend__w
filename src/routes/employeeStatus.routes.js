const express = require('express');
const controller = require('../controllers/employeeStatus.controller');
const { requireAuth } = require('../middleware/requireAuth');
const {
  setStatusValidators,
  userIdParamValidators,
  bulkStatusValidators,
} = require('../validators/employeeStatus.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/me', controller.getMyStatus);
router.delete('/me', controller.clearMyStatus);
router.post('/bulk', bulkStatusValidators, controller.getBulkStatuses);

router.post('/', setStatusValidators, controller.setMyStatus);
router.get('/:userId', userIdParamValidators, controller.getUserStatus);

module.exports = router;