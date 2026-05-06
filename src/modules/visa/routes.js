const express = require('express');
const router = express.Router();
const visaController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');
const upload = require('../../middleware/upload'); // Assuming this resolves property

router.use(protect);

router.post('/', authorize('ADMIN', 'VISA_AGENT'), visaController.createVisaProcess);
router.patch('/:id', authorize('ADMIN', 'VISA_AGENT', 'VISA_CLIENT'), visaController.updateVisaStatus); // Controller rejects Client mutations natively
router.get('/dashboard', authorize('ADMIN', 'VISA_AGENT'), visaController.getDashboard);
router.get('/my-status', authorize('VISA_CLIENT', 'STUDENT'), visaController.getVisaDetails);
router.post('/:id/document', authorize('ADMIN', 'VISA_AGENT', 'VISA_CLIENT', 'STUDENT'), upload.single('file'), visaController.uploadDocument);
router.get('/:userId', authorize('ADMIN', 'VISA_AGENT', 'COUNSELLOR'), visaController.getVisaDetails);


module.exports = router;
