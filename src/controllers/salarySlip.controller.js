const asyncHandler = require('../utils/asyncHandler');
const salarySlipService = require('../services/salarySlip.service');

const getSalarySlip = asyncHandler(async (req, res) => {
  const slip = await salarySlipService.getSalarySlip(req.user, req.params.id);
  res.set('Cache-Control', 'no-store');
  res.status(200).json(slip);
});

const downloadSalarySlipPdf = asyncHandler(async (req, res) => {
  const { buffer, fileName } = await salarySlipService.getSalarySlipPdf(req.user, req.params.id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
  });
  res.status(200).send(buffer);
});

module.exports = { getSalarySlip, downloadSalarySlipPdf };
