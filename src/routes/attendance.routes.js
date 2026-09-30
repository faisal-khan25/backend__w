const express = require('express');
const controller = require('../controllers/attendance.controller');
const { requireAuth } = require('../middleware/requireAuth');
const {
  punchInValidators,
  historyValidators,
  monthlySummaryValidators,
} = require('../validators/attendance.validators');

const router = express.Router();

router.use(requireAuth);

router.post('/punch-in', punchInValidators, controller.punchIn);
router.post('/punch-out', controller.punchOut);
router.get('/today', controller.getToday);
router.get('/history', historyValidators, controller.getHistory);
router.get('/summary', monthlySummaryValidators, controller.getMonthlySummary);

module.exports = router;
