const express = require('express');
const router = express.Router();
const leadController = require('./controller');
const bulkController = require('./bulk.controller');
const { protect } = require('../../middleware/auth');
const { authorize, requireConfirmedAgent } = require('../../middleware/role');
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.post('/bulk-upload', authorize('ADMIN'), uploadMemory.single('file'), bulkController.bulkUpload);
router.patch('/bulk-assign', authorize('ADMIN'), bulkController.bulkAssign);

router.post('/', authorize('ADMIN', 'TELECALLER', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), requireConfirmedAgent, leadController.createLead);
router.get('/', authorize('ADMIN', 'TELECALLER', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), leadController.getLeads);
router.get('/queue', authorize('ADMIN', 'TELECALLER', 'AGENT_MANAGER', 'COUNSELLOR'), leadController.getTelecallerQueue);
router.get('/interested', authorize('ADMIN', 'COUNSELLOR'), leadController.getInterestedLeads);
router.get('/my', authorize('ADMIN', 'TELECALLER', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), leadController.getMyLeads);
router.get('/:id', authorize('ADMIN', 'TELECALLER', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), leadController.getLeadById);
router.patch('/:id/status', authorize('ADMIN', 'TELECALLER', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), requireConfirmedAgent, leadController.updateLeadStatus);
router.delete('/:id', authorize('ADMIN'), leadController.deleteLead);



module.exports = router;
