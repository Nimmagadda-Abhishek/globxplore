const express = require('express');
const router = express.Router();
const webhookController = require('./webhook.controller');

/**
 * WhatsApp Webhook Routes
 * These routes are mounted at /api/webhooks/whatsapp
 * and must be public (no authentication middleware)
 */

// Meta verification handshake (GET)
router.get('/', webhookController.verifyWebhook);

// Incoming event handling (POST)
router.post('/', webhookController.handleWebhook);

module.exports = router;
