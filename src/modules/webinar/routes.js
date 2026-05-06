const express = require('express');
const router = express.Router();
const webinarController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);

router.get('/student', webinarController.getWebinars); // Viewable by everyone theoretically
router.post('/', authorize('ADMIN', 'COUNSELLOR'), webinarController.createWebinar);

module.exports = router;
