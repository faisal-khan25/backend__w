const express = require('express');
const controller = require('../controllers/payroll.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  generatePayslipValidators,
  listMyPayslipsValidators,
} = require('../validators/payroll.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/my', listMyPayslipsValidators, controller.listMyPayslips);
router.get('/my/:id', controller.getMyPayslip);
router.get('/my/:id/download', controller.downloadMyPayslip);

router.get('/', requireRole('HR', 'ADMIN'), controller.listAllPayslips);
router.post('/', requireRole('HR', 'ADMIN'), generatePayslipValidators, controller.generatePayslip);
router.post('/:id/mark-paid', requireRole('HR', 'ADMIN'), controller.markPaid);

module.exports = router;
