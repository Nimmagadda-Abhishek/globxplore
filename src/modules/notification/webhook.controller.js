/**
 * WhatsApp Webhook Controller
 * Handles Meta verification (handshake) and incoming webhook events
 */

// Verify the webhook from Meta
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if mode and token are in the query string
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      console.log('WEBHOOK_VERIFICATION_FAILED');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

// Handle incoming webhook events
exports.handleWebhook = (req, res) => {
  const body = req.body;

  // Log the body for debugging
  console.log('Incoming WhatsApp Webhook:', JSON.stringify(body, null, 2));

  // Check if the webhook event is from a WhatsApp Business Account
  if (body.object === 'whatsapp_business_account') {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // extract the phone number from the webhook payload
      const msg_body = message.text ? message.text.body : 'Media/Other message'; // extract the message text from the webhook payload

      console.log(`Message from ${from}: ${msg_body}`);
      
      // TODO: Add logic to handle incoming messages (e.g., save to DB, trigger response, etc.)
    }

    // Always return a 200 OK to Meta to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Return a 404 Not Found if event is not from a WhatsApp API
    res.sendStatus(404);
  }
};
