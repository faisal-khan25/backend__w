const express = require('express');
const controller = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.getMyDashboard);

module.exports = router;
