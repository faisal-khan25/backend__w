const express = require('express');
const controller = require('../controllers/demoRequest.controller');
const { demoRequestValidators } = require('../validators/demoRequest.validators');

const router = express.Router();

router.post('/demo-request', demoRequestValidators, controller.requestDemo);

module.exports = router;
