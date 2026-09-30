const asyncHandler = require('../utils/asyncHandler');
const employeeService = require('../services/employee.service');

const list = asyncHandler(async (req, res) => {
  const result = await employeeService.listEmployees(req.query);
  res.status(200).json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const result = await employeeService.getEmployee(req.params.id);
  res.status(200).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await employeeService.createEmployee(req.body);
  res.status(201).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await employeeService.updateEmployee(req.params.id, req.body);
  res.status(200).json(result);
});

const deactivate = asyncHandler(async (req, res) => {
  const result = await employeeService.deactivateEmployee(req.user, req.params.id);
  res.status(200).json(result);
});

module.exports = { list, getOne, create, update, deactivate };
