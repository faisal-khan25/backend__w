const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fields = {};
  result.array().forEach((err) => {
    if (!fields[err.path]) fields[err.path] = err.msg;
  });

  const error = new Error('Validation failed');
  error.type = 'validation';
  error.fields = fields;
  next(error);
}

module.exports = { validate };
