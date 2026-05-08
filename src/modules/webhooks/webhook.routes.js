const express = require('express');
const router = express.Router();
const webhookController = require('./webhook.controller');

router.get('/whatsapp', webhookController.verifyWebhook);
router.post('/whatsapp', webhookController.handleWebhook);

module.exports = router;
