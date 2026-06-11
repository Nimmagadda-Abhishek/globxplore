const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');
const telecallerDashboardController = require('./telecaller-dashboard.controller');

router.use(protect);

// Telecaller dashboard summary
router.get('/', authorize('TELECALLER'), telecallerDashboardController.getTelecallerDashboard);

module.exports = router;

