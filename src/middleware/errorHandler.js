const ApiError = require('../utils/ApiError');

module.exports = function errorHandler(err, req, res, next) {
  if (err.type === 'validation') {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Validation failed',
      fields: err.fields,
    });
  }

  if (err instanceof ApiError) {
    const body = {
      timestamp: new Date().toISOString(),
      status: err.status,
      error: err.message,
    };
    if (err.fields) body.fields = err.fields;
    return res.status(err.status).json(body);
  }

  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum size is 10MB' : err.message;
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: message,
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      timestamp: new Date().toISOString(),
      status: 409,
      error: 'A record with this value already exists',
    });
  }

  console.error(err);

  const isDev = process.env.NODE_ENV !== 'production';

  return res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: isDev ? `${err.name}: ${err.message}` : 'Something went wrong. Please try again.',
    ...(isDev && err.sql ? { sql: err.sql } : {}),
  });
};
