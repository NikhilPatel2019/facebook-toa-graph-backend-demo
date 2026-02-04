const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.get('/healthz', asyncHandler(healthController.healthCheck));

module.exports = router;
