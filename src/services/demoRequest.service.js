const { DemoRequest } = require('../models');

async function capture({ name, workEmail, company, companySize, message }) {
  const saved = await DemoRequest.create({
    name,
    workEmail,
    company,
    companySize,
    message,
    receivedAt: new Date(),
  });

  console.log(`New demo request captured: id=${saved.id} company=${saved.company}`);

  return { id: saved.id, status: 'received', receivedAt: saved.receivedAt };
}

module.exports = { capture };
