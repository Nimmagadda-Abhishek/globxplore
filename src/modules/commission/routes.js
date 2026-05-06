const express = require('express');
const router = express.Router();
const commissionController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);

router.post('/rate', authorize('ADMIN'), commissionController.setCommissionRate);
router.get('/my', authorize('AGENT'), commissionController.getMyCommissions);

module.exports = router;
