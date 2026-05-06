const express = require('express');
const router = express.Router();
const userController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');
const upload = require('../../middleware/upload');

router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

router.post('/agent', authorize('ADMIN', 'AGENT_MANAGER'), upload.single('businessBoardPhoto'), userController.createAgent);
router.patch('/agent/update-profile', authorize('AGENT'), upload.single('mouFile'), userController.updateAgentProfile);
router.patch('/agent/:id/status', authorize('ADMIN', 'AGENT_MANAGER'), userController.updateAgentStatus);
router.get('/agents', authorize('ADMIN', 'AGENT_MANAGER'), userController.getAgents);
router.get('/agent/:id', authorize('ADMIN', 'AGENT_MANAGER'), userController.getAgentById);
router.post('/agent-manager', authorize('ADMIN'), userController.createAgentManager);
router.get('/agent-managers', authorize('ADMIN'), userController.getAgentManagers);
router.get('/agent-manager/:id', authorize('ADMIN'), userController.getAgentManagerById);
router.post('/telecaller', authorize('ADMIN'), userController.createTelecaller);
router.get('/telecallers', authorize('ADMIN'), userController.getTelecallers);
router.post('/visa-agent', authorize('ADMIN'), userController.createVisaAgent);
router.get('/visa-agents', authorize('ADMIN'), userController.getVisaAgents);
router.post('/visa-client', authorize('ADMIN', 'VISA_AGENT'), userController.createVisaClient);
router.get('/subordinates', authorize('ADMIN', 'AGENT_MANAGER'), userController.getSubordinates);
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

module.exports = router;
