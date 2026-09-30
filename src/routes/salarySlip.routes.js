const express = require('express');
const controller = require('../controllers/salarySlip.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/:id/salary-slip', requireAuth, controller.getSalarySlip);
router.get('/:id/salary-slip/pdf', requireAuth, controller.downloadSalarySlipPdf);

module.exports = router;
