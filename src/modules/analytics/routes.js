const express = require('express');
const router = express.Router();
const analyticsController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);

router.get('/conversion', authorize('ADMIN', 'AGENT_MANAGER'), analyticsController.getConversionStats);
router.get('/revenue', authorize('ADMIN'), analyticsController.getRevenueStats);
router.get('/performance', authorize('ADMIN', 'AGENT_MANAGER'), analyticsController.getPerformanceStats);
router.get('/telecaller', authorize('ADMIN', 'AGENT_MANAGER'), analyticsController.getTelecallerPerformance);
router.get('/admin-dashboard', authorize('ADMIN'), analyticsController.getAdminDashboard);

module.exports = router;
