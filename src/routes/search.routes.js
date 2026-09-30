const express = require('express');
const controller = require('../controllers/search.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { globalSearchValidators, searchModuleValidators } = require('../validators/search.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', globalSearchValidators, controller.globalSearch);

router.get('/:module', searchModuleValidators, controller.searchModule);

module.exports = router;