const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { sendWelcomeEmail } = require('./email.service');

function toEmployeeResponse(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.getFullName(),
    email: user.email,
    role: user.role,
    department: user.department,
    profileImage: user.profileImage,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function generateTempPassword() {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = '@$!%*?&#';
  const all = lower + upper + digits + special;
  const pick = (set) => set[crypto.randomInt(set.length)];

  const chars = [pick(lower), pick(upper), pick(digits), pick(special)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function listEmployees(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 10, 1), 500);

  const where = {};
  if (query.role) where.role = query.role;
  if (query.department) where.department = query.department;
  if (query.isActive !== undefined && query.isActive !== '') {
    where.isActive = String(query.isActive) === 'true';
  }
  if (query.search && String(query.search).trim()) {
    const term = `%${String(query.search).trim()}%`;
    where[Op.or] = [
      { firstName: { [Op.like]: term } },
      { lastName: { [Op.like]: term } },
      { email: { [Op.like]: term } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    order: [['firstName', 'ASC'], ['lastName', 'ASC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    employees: rows.map(toEmployeeResponse),
    pagination: { page, pageSize, total: count, totalPages: Math.max(Math.ceil(count / pageSize), 1) },
  };
}

async function getEmployee(id) {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.employeeNotFound();
  return { employee: toEmployeeResponse(user) };
}

async function createEmployee({ firstName, lastName, email, role, department, password } = {}) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await User.findOne({ where: { email: normalizedEmail } });
  if (existing) throw ApiError.emailAlreadyExists();

  const generated = !password;
  const plainPassword = generated ? generateTempPassword() : password;

  const user = await User.create({
    firstName: String(firstName).trim(),
    lastName: lastName ? String(lastName).trim() : null,
    email: normalizedEmail,
    password: await bcrypt.hash(plainPassword, 10),
    role,
    department: department || null,
    isActive: true,
  });

  if (generated) {
    await sendWelcomeEmail(user.email, { name: user.getFullName(), tempPassword: plainPassword });
  }

  return {
    employee: toEmployeeResponse(user),
    ...(generated ? { temporaryPassword: plainPassword } : {}),
  };
}

async function updateEmployee(id, { firstName, lastName, department, role, isActive } = {}) {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.employeeNotFound();

  if (firstName !== undefined && firstName !== '') user.firstName = String(firstName).trim();
  if (lastName !== undefined) user.lastName = lastName ? String(lastName).trim() : null;
  if (department !== undefined) user.department = department || null;
  if (role !== undefined && role !== '') user.role = role;
  if (isActive !== undefined) user.isActive = isActive === true || isActive === 'true';

  await user.save();
  return { employee: toEmployeeResponse(user) };
}

async function deactivateEmployee(actor, id) {
  if (actor && actor.id === id) throw ApiError.cannotDeactivateSelf();

  const user = await User.findByPk(id);
  if (!user) throw ApiError.employeeNotFound();

  user.isActive = false;
  await user.save();
  return { employee: toEmployeeResponse(user) };
}

module.exports = {
  toEmployeeResponse,
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
};
