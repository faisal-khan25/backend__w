const express = require('express');
const controller = require('../controllers/payrollAdmin.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  calculatePayrollValidators,
  createPayrollValidators,
  updatePayrollValidators,
  markPaidValidators,
  listPayrollValidators,
} = require('../validators/payrollAdmin.validators');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'HR'));

router.post('/calculate', calculatePayrollValidators, controller.calculate);
router.post('/', createPayrollValidators, controller.create);
router.get('/', listPayrollValidators, controller.list);
router.get('/:id', controller.getOne);
router.put('/:id', updatePayrollValidators, controller.update);
router.post('/:id/approve', controller.approve);
router.post('/:id/finalize', controller.finalizePayroll);
router.post('/:id/generate-payslip', controller.generatePayslip);
router.post('/:id/mark-paid', markPaidValidators, controller.markPaid);
router.get('/:id/payslip', controller.getPayslipMeta);
router.get('/:id/payslip/download', controller.downloadPayslip);

module.exports = router;
