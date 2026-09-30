const { LeaveType } = require('../models');

const DEFAULT_LEAVE_TYPES = [
  { name: 'Casual Leave', annualQuota: 12, isPaid: true },
  { name: 'Sick Leave', annualQuota: 10, isPaid: true },
  { name: 'Earned Leave', annualQuota: 15, isPaid: true },
  { name: 'Unpaid Leave (LOP)', annualQuota: 365, isPaid: false },
];

async function seedReferenceData() {
  await Promise.all(
    DEFAULT_LEAVE_TYPES.map((type) =>
      LeaveType.findOrCreate({ where: { name: type.name }, defaults: type })
    )
  );
}

module.exports = seedReferenceData;
