const express = require('express');
const router = express.Router();
const activityController = require('./controller');
const { protect } = require('../../middleware/auth');

router.post('/heartbeat', protect, activityController.heartbeat);
router.post('/task/start', protect, activityController.startTask);
router.post('/task/end/:taskId', protect, activityController.endTask);
router.post('/log', protect, activityController.logActivity);

module.exports = router;
