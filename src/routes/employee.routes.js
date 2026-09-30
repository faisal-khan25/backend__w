const express = require('express');
const controller = require('../controllers/employee.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  listEmployeesValidators,
  createEmployeeValidators,
  updateEmployeeValidators,
} = require('../validators/employee.validators');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'HR'));

router.get('/', listEmployeesValidators, controller.list);
router.post('/', createEmployeeValidators, controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', updateEmployeeValidators, controller.update);
router.delete('/:id', controller.deactivate);

module.exports = router;
