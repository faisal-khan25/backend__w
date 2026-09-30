module.exports = function notFound(req, res) {
  res.status(404).json({
    timestamp: new Date().toISOString(),
    status: 404,
    error: `No handler found for ${req.method} ${req.originalUrl}`,
  });
};
