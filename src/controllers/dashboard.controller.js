const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboard.service');

const getMyDashboard = asyncHandler(async (req, res) => {
  const result = await dashboardService.getMyDashboard(req.user);
  res.status(200).json(result);
});

module.exports = { getMyDashboard };
