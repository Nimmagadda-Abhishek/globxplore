const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.use(protect);

router.post('/upload', upload.single('file'), controller.uploadDocument);
router.get('/', controller.getDocuments);
router.patch('/:id/status', controller.updateDocumentStatus);

module.exports = router;
