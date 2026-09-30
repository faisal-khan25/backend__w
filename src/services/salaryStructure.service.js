const { Op } = require('sequelize');
const { EmployeeSalaryStructure, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/payrollCalculator');

function toResponse(s) {
  return {
    id: s.id,
    userId: s.userId,
    basicSalary: Number(s.basicSalary),
    hra: Number(s.hra),
    otherAllowances: Number(s.otherAllowances),
    grossSalary: Number(s.grossSalary),
    effectiveFrom: s.effectiveFrom,
    effectiveTo: s.effectiveTo,
    isActive: !s.effectiveTo,
    createdBy: s.createdBy,
    updatedBy: s.updatedBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function dayBefore(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

async function getActiveStructureAsOf(userId, asOfDate) {
  return EmployeeSalaryStructure.findOne({
    where: {
      userId,
      effectiveFrom: { [Op.lte]: asOfDate },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: asOfDate } }],
    },
    order: [['effectiveFrom', 'DESC']],
  });
}

async function listForEmployee(employeeId) {
  const employee = await User.findByPk(employeeId);
  if (!employee) throw ApiError.employeeNotFound();

  const structures = await EmployeeSalaryStructure.findAll({
    where: { userId: employeeId },
    order: [['effectiveFrom', 'DESC']],
  });
  return {
    employeeId,
    structures: structures.map(toResponse),
    active: structures.find((s) => !s.effectiveTo) ? toResponse(structures.find((s) => !s.effectiveTo)) : null,
  };
}

async function upsertForEmployee(actingUser, employeeId, { basicSalary, hra, otherAllowances, effectiveFrom, effectiveTo }) {
  const employee = await User.findByPk(employeeId);
  if (!employee) throw ApiError.employeeNotFound();

  if (effectiveTo && effectiveTo < effectiveFrom) throw ApiError.invalidEffectiveDateRange();

  const grossSalary = round2(Number(basicSalary) + Number(hra || 0) + Number(otherAllowances || 0));

  const currentActive = await EmployeeSalaryStructure.findOne({
    where: { userId: employeeId, effectiveTo: null },
    order: [['effectiveFrom', 'DESC']],
  });

  if (currentActive && currentActive.effectiveFrom === effectiveFrom) {
    currentActive.basicSalary = basicSalary;
    currentActive.hra = hra || 0;
    currentActive.otherAllowances = otherAllowances || 0;
    currentActive.grossSalary = grossSalary;
    currentActive.effectiveTo = effectiveTo || null;
    currentActive.updatedBy = actingUser.id;
    await currentActive.save();
    return toResponse(currentActive);
  }

  if (currentActive && currentActive.effectiveFrom < effectiveFrom) {
    currentActive.effectiveTo = dayBefore(effectiveFrom);
    currentActive.updatedBy = actingUser.id;
    await currentActive.save();
  }

  const created = await EmployeeSalaryStructure.create({
    userId: employeeId,
    basicSalary,
    hra: hra || 0,
    otherAllowances: otherAllowances || 0,
    grossSalary,
    effectiveFrom,
    effectiveTo: effectiveTo || null,
    createdBy: actingUser.id,
    updatedBy: actingUser.id,
  });

  return toResponse(created);
}

module.exports = { toResponse, getActiveStructureAsOf, listForEmployee, upsertForEmployee };
