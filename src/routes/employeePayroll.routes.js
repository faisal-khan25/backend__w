const express = require('express');
const controller = require('../controllers/payrollEmployee.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/', controller.listMine);
router.get('/:id', controller.getMine);
router.get('/:id/payslip', controller.getMyPayslipMeta);
router.get('/:id/payslip/download', controller.downloadMyPayslip);

module.exports = router;
