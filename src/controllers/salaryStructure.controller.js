const asyncHandler = require('../utils/asyncHandler');
const salaryStructureService = require('../services/salaryStructure.service');

const create = asyncHandler(async (req, res) => {
  const { employeeId, ...rest } = req.body;
  const result = await salaryStructureService.upsertForEmployee(req.user, employeeId, rest);
  res.status(201).json(result);
});

const getForEmployee = asyncHandler(async (req, res) => {
  const result = await salaryStructureService.listForEmployee(req.params.employeeId);
  res.status(200).json(result);
});

const updateForEmployee = asyncHandler(async (req, res) => {
  const result = await salaryStructureService.upsertForEmployee(req.user, req.params.employeeId, req.body);
  res.status(200).json(result);
});

module.exports = { create, getForEmployee, updateForEmployee };
