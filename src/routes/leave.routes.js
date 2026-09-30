const express = require('express');
const controller = require('../controllers/leave.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  applyLeaveValidators,
  listMyLeavesValidators,
  decideValidators,
} = require('../validators/leave.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/types', controller.listLeaveTypes);
router.get('/balance', controller.getBalance);


router.post('/', applyLeaveValidators, controller.applyLeave);
router.get('/my', listMyLeavesValidators, controller.listMyLeaves);
router.post('/:id/cancel', controller.cancelLeave);


router.get('/pending', requireRole('MANAGER', 'HR', 'ADMIN'), controller.listPendingApprovals);
router.post('/:id/decide', requireRole('MANAGER', 'HR', 'ADMIN'), decideValidators, controller.decide);

module.exports = router;
