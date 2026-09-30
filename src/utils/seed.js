const bcrypt = require('bcryptjs');
const { User } = require('../models');

const SEED_EMAIL = 'admin@union.dev';
const SEED_PASSWORD = 'Admin@123';


async function seedDevAdmin() {
  const exists = await User.findOne({ where: { email: SEED_EMAIL } });
  if (exists) return;

  await User.create({
    firstName: 'Union',
    lastName: 'Admin',
    email: SEED_EMAIL,
    password: await bcrypt.hash(SEED_PASSWORD, 10),
    role: 'ADMIN',
    department: 'Administration',
    isActive: true,
  });

  console.log(`Seeded dev admin account -> email: ${SEED_EMAIL}, password: ${SEED_PASSWORD}`);
}

module.exports = seedDevAdmin;

if (require.main === module) {
  require('dotenv').config();
  const sequelize = require('../config/db');
  sequelize
    .authenticate()
    .then(() => seedDevAdmin())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
