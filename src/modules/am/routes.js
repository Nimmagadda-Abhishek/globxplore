const express = require('express');
const router = express.Router();
const amController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

// All routes are protected and restricted to AGENT_MANAGER
router.use(protect);
router.use(authorize('AGENT_MANAGER'));

router.route('/profile')
  .get(amController.getProfile)
  .put(amController.updateProfile);

router.put('/change-password', amController.changePassword);

router.route('/agents')
  .get(amController.getAgents)
  .post(amController.createAgent);

router.get('/agents/search', amController.searchAgents);
router.get('/agents/map', amController.getMapData);

router.route('/agents/:id')
  .get(amController.getAgentById)
  .put(amController.updateAgentStatus);

router.patch('/agents/:id/status', amController.updateAgentStatus);

router.get('/dashboard/summary', amController.getDashboardSummary);
router.get('/notifications', amController.getNotifications);
router.get('/activity', amController.getActivities);
router.get('/analytics/performance', amController.getPerformance);

router.route('/followups')
  .get(amController.getFollowUps)
  .post(amController.createFollowUp);

router.patch('/followups/:id', amController.updateFollowUpStatus);

router.route('/students')
  .get(amController.getStudents)
  .post(amController.createStudent);

module.exports = router;
