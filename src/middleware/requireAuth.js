
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Authentication required. Please log in.',
    });
  }
  if (!req.user.isActive) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Account is deactivated',
    });
  }
  next();
}


function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        error: 'You do not have permission to access this resource',
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
