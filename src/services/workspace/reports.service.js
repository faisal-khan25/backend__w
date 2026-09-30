const { Op } = require('sequelize');
const {
  User,
  EmployeeProfile,
  Attendance,
  LeaveRequest,
  LeaveType,
  Task,
  Payslip,
  Document,
} = require('../../models');
const ApiError = require('../../utils/ApiError');

const ATTENDANCE_PRESENT_STATUSES = ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'];

function todayDateOnly(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

function resolveDateRange({ range, from, to } = {}) {
  if (from || to) return { from: from || undefined, to: to || undefined };

  const today = new Date();
  switch (range) {
    case 'today': {
      const t = fmt(today);
      return { from: t, to: t };
    }
    case 'this_week': {
      const start = new Date(today);
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      return { from: fmt(start), to: fmt(today) };
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(start), to: fmt(today) };
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { from: fmt(start), to: fmt(today) };
    }
    default:
      return { from: undefined, to: undefined };
  }
}

async function resolveScope(user) {
  if (user.role === 'ADMIN' || user.role === 'HR') {
    return { restricted: false, userIds: null };
  }

  if (user.role === 'MANAGER') {
    const directReports = await EmployeeProfile.findAll({
      where: { reportingManagerId: user.id },
      attributes: ['userId'],
    });
    let userIds = directReports.map((p) => p.userId);

    if (userIds.length === 0 && user.department) {
      const peers = await User.findAll({
        where: { department: user.department, isActive: true },
        attributes: ['id'],
      });
      userIds = peers.map((p) => p.id);
    }
    if (!userIds.includes(user.id)) userIds.push(user.id);
    return { restricted: true, userIds };
  }

  return { restricted: true, userIds: [user.id] };
}

function assertEmployeeInScope(scope, employeeId) {
  if (employeeId && scope.restricted && !scope.userIds.includes(employeeId)) {
    throw ApiError.reportScopeForbidden();
  }
}

function scopedIdFilter(scope) {
  return { [Op.in]: scope.userIds.length ? scope.userIds : ['__none__'] };
}

function paginate(page, pageSize, maxLimit = 200) {
  const limit = Math.min(Math.max(Number(pageSize) || 20, 1), maxLimit);
  const p = Math.max(Number(page) || 1, 1);
  return { limit, offset: (p - 1) * limit, page: p };
}

function paginationMeta(page, limit, count) {
  return { page, pageSize: limit, total: count, totalPages: Math.max(Math.ceil(count / limit), 1) };
}

function employeeBrief(u) {
  if (!u) return null;
  return { id: u.id, name: u.getFullName(), email: u.email, department: u.department };
}

async function getDashboardSummary(user) {
  const scope = await resolveScope(user);
  const today = todayDateOnly();
  const scopedUserFilter = scope.restricted ? { id: scopedIdFilter(scope) } : {};
  const scopedFkFilter = (fk) => (scope.restricted ? { [fk]: scopedIdFilter(scope) } : {});

  const [
    totalEmployees,
    activeEmployees,
    presentToday,
    onLeaveToday,
    pendingTasks,
    completedTasks,
    documentsUploaded,
  ] = await Promise.all([
    User.count({ where: scopedUserFilter }),
    User.count({ where: { ...scopedUserFilter, isActive: true } }),
    Attendance.count({
      where: { date: today, status: { [Op.in]: ATTENDANCE_PRESENT_STATUSES }, ...scopedFkFilter('userId') },
    }),
    LeaveRequest.count({
      where: {
        status: 'APPROVED',
        fromDate: { [Op.lte]: today },
        toDate: { [Op.gte]: today },
        ...scopedFkFilter('userId'),
      },
    }),
    Task.count({ where: { status: 'PENDING', ...scopedFkFilter('assignedTo') } }),
    Task.count({ where: { status: 'COMPLETED', ...scopedFkFilter('assignedTo') } }),
    Document.count({ where: scopedFkFilter('userId') }),
  ]);

  const absentToday = Math.max(activeEmployees - presentToday - onLeaveToday, 0);

  return {
    date: today,
    cards: {
      totalEmployees,
      activeEmployees,
      presentToday,
      absentToday,
      onLeaveToday,
      pendingTasks,
      completedTasks,
      documentsUploaded,
    },
  };
}

function toEmployeeReportRow(u) {
  const profile = u.EmployeeProfile;
  const location = profile ? [profile.city, profile.state, profile.country].filter(Boolean).join(', ') : null;
  return {
    id: u.id,
    name: u.getFullName(),
    email: u.email,
    department: u.department,
    designation: profile?.designation || null,
    role: u.role,
    joiningDate: profile?.dateOfJoining || null,
    status: u.isActive ? 'ACTIVE' : 'INACTIVE',
    manager: profile?.reportingManager
      ? { id: profile.reportingManager.id, name: profile.reportingManager.getFullName() }
      : null,
    location: location || null,
  };
}

async function getEmployeeReport(user, filters = {}) {
  const scope = await resolveScope(user);
  const { department, role, status, dateFrom, dateTo, managerId, search, sort, page, pageSize, maxLimit } = filters;

  assertEmployeeInScope(scope, filters.employeeId);

  const where = {};
  if (filters.employeeId) where.id = filters.employeeId;
  else if (scope.restricted) where.id = scopedIdFilter(scope);

  if (department) where.department = department;
  if (role) where.role = role;
  if (status === 'ACTIVE') where.isActive = true;
  else if (status === 'INACTIVE') where.isActive = false;
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const profileWhere = {};
  if (dateFrom) profileWhere.dateOfJoining = { ...(profileWhere.dateOfJoining || {}), [Op.gte]: dateFrom };
  if (dateTo) profileWhere.dateOfJoining = { ...(profileWhere.dateOfJoining || {}), [Op.lte]: dateTo };
  if (managerId) profileWhere.reportingManagerId = managerId;

  const profileInclude = {
    model: EmployeeProfile,
    required: Object.keys(profileWhere).length > 0,
    where: Object.keys(profileWhere).length ? profileWhere : undefined,
    include: [{ model: User, as: 'reportingManager', attributes: ['id', 'firstName', 'lastName'], required: false }],
  };

  let order = [['firstName', 'ASC'], ['lastName', 'ASC']];
  if (sort === 'name_desc') order = [['firstName', 'DESC'], ['lastName', 'DESC']];
  else if (sort === 'department') order = [['department', 'ASC'], ['firstName', 'ASC']];
  else if (sort === 'status') order = [['isActive', 'DESC'], ['firstName', 'ASC']];
  else if (sort === 'joining_date_asc') order = [[profileInclude, 'dateOfJoining', 'ASC']];
  else if (sort === 'joining_date_desc') order = [[profileInclude, 'dateOfJoining', 'DESC']];

  const { limit, offset, page: p } = paginate(page, pageSize, maxLimit);

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [profileInclude],
    order,
    limit,
    offset,
    distinct: true,
    subQuery: false,
  });

  return {
    employees: rows.map(toEmployeeReportRow),
    pagination: paginationMeta(p, limit, count),
  };
}

function toAttendanceReportRow(record) {
  return {
    id: record.id,
    employee: employeeBrief(record.employee),
    date: record.date,
    punchIn: record.punchIn,
    punchOut: record.punchOut,
    workingHours: record.totalHours !== null && record.totalHours !== undefined ? Number(record.totalHours) : null,
    status: record.status,
    isLate: record.status === 'LATE',
    overtimeHours: null,
  };
}

async function getAttendanceReport(user, filters = {}) {
  const scope = await resolveScope(user);
  const { employeeId, department, status, page, pageSize, maxLimit } = filters;
  const { from, to } = resolveDateRange(filters);

  assertEmployeeInScope(scope, employeeId);

  const where = {};
  if (from) where.date = { ...(where.date || {}), [Op.gte]: from };
  if (to) where.date = { ...(where.date || {}), [Op.lte]: to };
  if (status) where.status = status;
  if (employeeId) where.userId = employeeId;
  else if (scope.restricted) where.userId = scopedIdFilter(scope);

  const userWhere = { isActive: true };
  if (department) userWhere.department = department;

  const { limit, offset, page: p } = paginate(page, pageSize, maxLimit);

  const [{ rows, count }, summaryRows] = await Promise.all([
    Attendance.findAndCountAll({
      where,
      include: [
        { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department', 'email'], where: userWhere },
      ],
      order: [['date', 'DESC']],
      limit,
      offset,
      distinct: true,
    }),
    Attendance.findAll({
      where,
      include: [{ model: User, as: 'employee', attributes: [], where: userWhere, required: true }],
      attributes: ['status'],
      raw: true,
    }),
  ]);

  const summary = { total: summaryRows.length, present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0 };
  summaryRows.forEach((r) => {
    if (r.status === 'LATE') { summary.late += 1; summary.present += 1; }
    else if (r.status === 'PRESENT' || r.status === 'WORK_FROM_HOME') summary.present += 1;
    else if (r.status === 'HALF_DAY') summary.halfDay += 1;
    else if (r.status === 'ON_LEAVE') summary.onLeave += 1;
    else if (r.status === 'ABSENT') summary.absent += 1;
  });

  return {
    records: rows.map(toAttendanceReportRow),
    summary,
    pagination: paginationMeta(p, limit, count),
  };
}

function toLeaveReportRow(r) {
  return {
    id: r.id,
    employee: employeeBrief(r.employee),
    leaveType: r.leaveType ? r.leaveType.name : null,
    fromDate: r.fromDate,
    toDate: r.toDate,
    days: Number(r.days),
    status: r.status,
    reason: r.reason,
  };
}

async function getLeaveReport(user, filters = {}) {
  const scope = await resolveScope(user);
  const { employeeId, department, leaveTypeId, status, page, pageSize, maxLimit } = filters;
  const { from, to } = resolveDateRange(filters);

  assertEmployeeInScope(scope, employeeId);

  const where = {};
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (status) where.status = status;
  if (from) where.toDate = { ...(where.toDate || {}), [Op.gte]: from };
  if (to) where.fromDate = { ...(where.fromDate || {}), [Op.lte]: to };
  if (employeeId) where.userId = employeeId;
  else if (scope.restricted) where.userId = scopedIdFilter(scope);

  const userWhere = {};
  if (department) userWhere.department = department;

  const { limit, offset, page: p } = paginate(page, pageSize, maxLimit);

  const [{ rows, count }, summaryRows] = await Promise.all([
    LeaveRequest.findAndCountAll({
      where,
      include: [
        { model: LeaveType, as: 'leaveType' },
        { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department', 'email'], where: userWhere },
      ],
      order: [['appliedAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    }),
    LeaveRequest.findAll({
      where,
      include: [{ model: User, as: 'employee', attributes: [], where: userWhere, required: true }],
      attributes: ['status'],
      raw: true,
    }),
  ]);

  const summary = { total: summaryRows.length, approved: 0, pending: 0, rejected: 0, cancelled: 0 };
  summaryRows.forEach((r) => {
    if (r.status === 'APPROVED') summary.approved += 1;
    else if (r.status === 'PENDING') summary.pending += 1;
    else if (r.status === 'REJECTED') summary.rejected += 1;
    else if (r.status === 'CANCELLED') summary.cancelled += 1;
  });

  return {
    records: rows.map(toLeaveReportRow),
    summary,
    pagination: paginationMeta(p, limit, count),
  };
}

function toTaskReportRow(t) {
  return {
    id: t.id,
    title: t.title,
    assignee: employeeBrief(t.assignee),
    department: t.assignee ? t.assignee.department : null,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    createdDate: t.createdAt,
    completedDate: t.completedAt,
  };
}

async function getTaskReport(user, filters = {}) {
  const scope = await resolveScope(user);
  const { employeeId, department, priority, status, dueFrom, dueTo, page, pageSize, maxLimit } = filters;

  assertEmployeeInScope(scope, employeeId);

  const where = {};
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (dueFrom) where.dueDate = { ...(where.dueDate || {}), [Op.gte]: dueFrom };
  if (dueTo) where.dueDate = { ...(where.dueDate || {}), [Op.lte]: dueTo };
  if (employeeId) where.assignedTo = employeeId;
  else if (scope.restricted) where.assignedTo = scopedIdFilter(scope);

  const userWhere = {};
  if (department) userWhere.department = department;
  const assigneeAttrs = ['id', 'firstName', 'lastName', 'email', 'department'];

  const { limit, offset, page: p } = paginate(page, pageSize, maxLimit);

  const [{ rows, count }, allMatching] = await Promise.all([
    Task.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: assigneeAttrs, where: userWhere },
        { model: User, as: 'assigner', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    }),
    Task.findAll({
      where,
      include: [{ model: User, as: 'assignee', attributes: assigneeAttrs, where: userWhere, required: true }],
      attributes: ['id', 'status', 'dueDate'],
      limit: 5000,
    }),
  ]);

  const today = todayDateOnly();
  const stats = { total: allMatching.length, pending: 0, inProgress: 0, completed: 0, overdue: 0, cancelled: 0 };
  const workloadMap = new Map();
  allMatching.forEach((t) => {
    if (t.status === 'PENDING') stats.pending += 1;
    else if (t.status === 'IN_PROGRESS') stats.inProgress += 1;
    else if (t.status === 'COMPLETED') stats.completed += 1;
    else if (t.status === 'CANCELLED') stats.cancelled += 1;
    if (!['COMPLETED', 'CANCELLED'].includes(t.status) && t.dueDate && t.dueDate < today) stats.overdue += 1;

    const emp = t.assignee;
    if (emp) {
      if (!workloadMap.has(emp.id)) {
        workloadMap.set(emp.id, { employeeId: emp.id, name: emp.getFullName(), department: emp.department, total: 0, completed: 0 });
      }
      const w = workloadMap.get(emp.id);
      w.total += 1;
      if (t.status === 'COMPLETED') w.completed += 1;
    }
  });

  const workloadByEmployee = Array.from(workloadMap.values()).sort((a, b) => b.total - a.total).slice(0, 20);

  return {
    tasks: rows.map(toTaskReportRow),
    stats,
    workloadByEmployee,
    pagination: paginationMeta(p, limit, count),
  };
}

function toPayrollReportRow(slip) {
  return {
    id: slip.id,
    employee: employeeBrief(slip.employee),
    payPeriod: `${String(slip.month).padStart(2, '0')}/${slip.year}`,
    grossSalary: Number(slip.basicSalary) + Number(slip.allowances),
    deductions: Number(slip.deductions),
    netSalary: Number(slip.netPay),
    status: slip.status,
  };
}

function assertPayrollAccess(user) {
  if (!['ADMIN', 'HR'].includes(user.role)) throw ApiError.reportScopeForbidden();
}

async function getPayrollReport(user, filters = {}) {
  assertPayrollAccess(user);
  const { employeeId, department, month, year, status, page, pageSize, maxLimit } = filters;

  const where = {};
  if (employeeId) where.userId = employeeId;
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  if (status) where.status = status;

  const userWhere = {};
  if (department) userWhere.department = department;

  const { limit, offset, page: p } = paginate(page, pageSize, maxLimit);

  const [{ rows, count }, summaryRows] = await Promise.all([
    Payslip.findAndCountAll({
      where,
      include: [{ model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department'], where: userWhere }],
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit,
      offset,
      distinct: true,
    }),
    Payslip.findAll({
      where,
      include: [{ model: User, as: 'employee', attributes: [], where: userWhere, required: true }],
      attributes: ['basicSalary', 'allowances', 'deductions', 'netPay'],
      raw: true,
    }),
  ]);

  const summary = summaryRows.reduce(
    (acc, r) => {
      acc.grossTotal += Number(r.basicSalary) + Number(r.allowances);
      acc.deductionsTotal += Number(r.deductions);
      acc.netTotal += Number(r.netPay);
      return acc;
    },
    { count: summaryRows.length, grossTotal: 0, deductionsTotal: 0, netTotal: 0 }
  );

  return {
    payslips: rows.map(toPayrollReportRow),
    summary,
    pagination: paginationMeta(p, limit, count),
  };
}

async function getDepartmentReport(user, filters = {}) {
  const scope = await resolveScope(user);
  const { department } = filters;
  const today = todayDateOnly();

  const userWhere = { isActive: true };
  if (department) userWhere.department = department;
  if (scope.restricted) userWhere.id = scopedIdFilter(scope);

  const employees = await User.findAll({ where: userWhere, attributes: ['id', 'department'] });
  const allIds = employees.map((e) => e.id);

  const byDept = new Map();
  employees.forEach((e) => {
    const key = e.department || 'Unassigned';
    if (!byDept.has(key)) byDept.set(key, { department: key, employees: 0, ids: [] });
    const d = byDept.get(key);
    d.employees += 1;
    d.ids.push(e.id);
  });

  const [attendanceToday, tasksAll] = await Promise.all([
    Attendance.findAll({
      where: { date: today, userId: { [Op.in]: allIds.length ? allIds : ['__none__'] } },
      attributes: ['userId', 'status'],
      raw: true,
    }),
    Task.findAll({
      where: { assignedTo: { [Op.in]: allIds.length ? allIds : ['__none__'] } },
      attributes: ['assignedTo', 'status'],
      raw: true,
    }),
  ]);

  const attByUser = new Map(attendanceToday.map((a) => [a.userId, a.status]));
  const tasksByUser = new Map();
  tasksAll.forEach((t) => {
    if (!tasksByUser.has(t.assignedTo)) tasksByUser.set(t.assignedTo, []);
    tasksByUser.get(t.assignedTo).push(t.status);
  });

  const departments = Array.from(byDept.values())
    .map((d) => {
      let present = 0;
      let absent = 0;
      let onLeave = 0;
      let tasks = 0;
      let completedTasks = 0;

      d.ids.forEach((id) => {
        const st = attByUser.get(id);
        if (ATTENDANCE_PRESENT_STATUSES.includes(st)) present += 1;
        else if (st === 'ON_LEAVE') onLeave += 1;
        else absent += 1;

        (tasksByUser.get(id) || []).forEach((taskStatus) => {
          tasks += 1;
          if (taskStatus === 'COMPLETED') completedTasks += 1;
        });
      });

      return { department: d.department, employees: d.employees, present, absent, onLeave, tasks, completedTasks };
    })
    .sort((a, b) => b.employees - a.employees);

  return { date: today, departments };
}

async function getDocumentReport(user, filters = {}) {
  const scope = await resolveScope(user);
  const { employeeId, category, status, department, page, pageSize, maxLimit } = filters;

  assertEmployeeInScope(scope, employeeId);

  const where = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (employeeId) where.userId = employeeId;
  else if (scope.restricted) where.userId = scopedIdFilter(scope);

  const userWhere = {};
  if (department) userWhere.department = department;

  const { limit, offset, page: p } = paginate(page, pageSize, maxLimit);

  const [{ rows, count }, summaryRows] = await Promise.all([
    Document.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'department'], where: userWhere }],
      order: [['uploadedAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    }),
    Document.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: [], where: userWhere, required: true }],
      attributes: ['status'],
      raw: true,
    }),
  ]);

  const summary = { total: summaryRows.length, approved: 0, pending: 0, rejected: 0 };
  summaryRows.forEach((r) => {
    if (r.status === 'APPROVED') summary.approved += 1;
    else if (r.status === 'PENDING') summary.pending += 1;
    else if (r.status === 'REJECTED') summary.rejected += 1;
  });

  return {
    documents: rows.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      status: d.status,
      employee: employeeBrief(d.owner),
      uploadedAt: d.uploadedAt,
      fileSize: d.fileSize,
    })),
    summary,
    pagination: paginationMeta(p, limit, count),
  };
}

const CATEGORY_LABELS = {
  employees: 'Employee Reports',
  attendance: 'Attendance Reports',
  leave: 'Leave Reports',
  tasks: 'Task Reports',
  payroll: 'Payroll Reports',
  documents: 'Document Reports',
};

const CUSTOM_REPORT_FIELDS = {
  employees: [
    { key: 'id', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'role', label: 'Role' },
    { key: 'joiningDate', label: 'Joining Date' },
    { key: 'status', label: 'Status' },
    { key: 'manager.name', label: 'Manager' },
    { key: 'location', label: 'Location' },
  ],
  attendance: [
    { key: 'employee.name', label: 'Employee' },
    { key: 'employee.department', label: 'Department' },
    { key: 'date', label: 'Date' },
    { key: 'punchIn', label: 'Punch In' },
    { key: 'punchOut', label: 'Punch Out' },
    { key: 'workingHours', label: 'Working Hours' },
    { key: 'status', label: 'Status' },
  ],
  leave: [
    { key: 'employee.name', label: 'Employee' },
    { key: 'employee.department', label: 'Department' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'fromDate', label: 'From Date' },
    { key: 'toDate', label: 'To Date' },
    { key: 'days', label: 'Days' },
    { key: 'status', label: 'Status' },
    { key: 'reason', label: 'Reason' },
  ],
  tasks: [
    { key: 'title', label: 'Task' },
    { key: 'assignee.name', label: 'Assigned Employee' },
    { key: 'department', label: 'Department' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'createdDate', label: 'Created Date' },
    { key: 'completedDate', label: 'Completion Date' },
  ],
  payroll: [
    { key: 'employee.name', label: 'Employee' },
    { key: 'employee.department', label: 'Department' },
    { key: 'payPeriod', label: 'Pay Period' },
    { key: 'grossSalary', label: 'Gross Salary' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'netSalary', label: 'Net Salary' },
    { key: 'status', label: 'Payroll Status' },
  ],
  documents: [
    { key: 'employee.name', label: 'Employee' },
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'uploadedAt', label: 'Uploaded At' },
  ],
};

const REPORT_FETCHERS = {
  employees: (user, f) => getEmployeeReport(user, f).then((r) => r.employees),
  attendance: (user, f) => getAttendanceReport(user, f).then((r) => r.records),
  leave: (user, f) => getLeaveReport(user, f).then((r) => r.records),
  tasks: (user, f) => getTaskReport(user, f).then((r) => r.tasks),
  payroll: (user, f) => getPayrollReport(user, f).then((r) => r.payslips),
  documents: (user, f) => getDocumentReport(user, f).then((r) => r.documents),
};

function getCustomReportMeta(user) {
  const allCategories = Object.keys(CUSTOM_REPORT_FIELDS);
  const categories = ['ADMIN', 'HR'].includes(user.role) ? allCategories : allCategories.filter((c) => c !== 'payroll');

  return {
    categories: categories.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      fields: CUSTOM_REPORT_FIELDS[key],
    })),
  };
}

async function getCustomReport(user, { category, fields, filters = {}, page, pageSize } = {}) {
  if (!REPORT_FETCHERS[category]) {
    throw new ApiError(400, `Unknown report category "${category}"`);
  }
  if (category === 'payroll') assertPayrollAccess(user);

  const allFields = CUSTOM_REPORT_FIELDS[category];
  const selected = Array.isArray(fields) && fields.length
    ? allFields.filter((f) => fields.includes(f.key))
    : allFields;

  const rows = await REPORT_FETCHERS[category](user, { ...filters, page, pageSize: pageSize || 50, maxLimit: 500 });

  return { category, columns: selected, rows };
}

async function exportReport(user, { type, ...filters } = {}) {
  if (!REPORT_FETCHERS[type]) {
    throw new ApiError(400, `Unknown export type "${type}"`);
  }
  if (type === 'payroll') assertPayrollAccess(user);

  const rows = await REPORT_FETCHERS[type](user, { ...filters, page: 1, pageSize: 5000, maxLimit: 5000 });
  return { columns: CUSTOM_REPORT_FIELDS[type], rows };
}

module.exports = {
  resolveDateRange,
  resolveScope,
  getDashboardSummary,
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getTaskReport,
  getPayrollReport,
  getDepartmentReport,
  getDocumentReport,
  getCustomReportMeta,
  getCustomReport,
  exportReport,
};
