const express = require('express');
const router = express.Router();
const counsellorController = require('./counsellor.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);
router.use(authorize('COUNSELLOR', 'ADMIN'));

router.get('/dashboard/stats', counsellorController.getDashboardStats);
router.get('/dashboard/urgent-actions', counsellorController.getUrgentActions);
router.get('/dashboard/pipeline', counsellorController.getPipeline);
router.get('/students', counsellorController.getMyStudents);

module.exports = router;
