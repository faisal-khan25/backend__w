const express = require('express');
const controller = require('../controllers/salaryStructure.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  createSalaryStructureValidators,
  updateSalaryStructureValidators,
} = require('../validators/salaryStructure.validators');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'HR'));

router.post('/', createSalaryStructureValidators, controller.create);
router.get('/:employeeId', controller.getForEmployee);
router.put('/:employeeId', updateSalaryStructureValidators, controller.updateForEmployee);

module.exports = router;
