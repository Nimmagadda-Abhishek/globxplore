const express = require('express');
const router = express.Router();
const visaClientController = require('./visa_client.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');
const upload = require('../../middleware/upload');

// Public routes
router.post('/login', visaClientController.login);

// Protected routes
router.use(protect);
router.use(authorize('VISA_CLIENT'));

router.get('/me', visaClientController.getMe);
router.get('/pipeline', visaClientController.getPipeline);
router.post('/documents', upload.single('file'), visaClientController.uploadDocuments);
router.get('/checklist', visaClientController.getChecklist);
router.post('/checklist/:id/upload', upload.single('file'), visaClientController.uploadChecklistDocument);

// Notifications placeholder
router.get('/notifications', (req, res) => res.json({ success: true, data: [] }));

module.exports = router;
