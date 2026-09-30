const express = require('express');
const controller = require('../controllers/holiday.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  listHolidaysValidators,
  upcomingValidators,
  createHolidayValidators,
  updateHolidayValidators,
} = require('../validators/holiday.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', listHolidaysValidators, controller.list);
router.get('/upcoming', upcomingValidators, controller.upcoming);

router.post('/', requireRole('ADMIN', 'HR'), createHolidayValidators, controller.create);
router.put('/:id', requireRole('ADMIN', 'HR'), updateHolidayValidators, controller.update);
router.delete('/:id', requireRole('ADMIN', 'HR'), controller.remove);

module.exports = router;
