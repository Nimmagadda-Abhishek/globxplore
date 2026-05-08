const Student = require('../student/model');
const Lead = require('../lead/model');
const User = require('../user/model');
const Notification = require('./model');
const WhatsAppProvider = require('./whatsapp.provider');
const { sendRealTimeNotification } = require('./notification.socket');

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
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    // Log the body for debugging
    console.log('--- Incoming WhatsApp Webhook ---');
    console.log(JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = WhatsAppProvider.normalizePhone(message.from); 
        const msg_body = message.text ? message.text.body : 'Media/Other message';

        console.log(`[Webhook] Processing message from: ${from}`);
        console.log(`[Webhook] Content: ${msg_body}`);

        const phoneSuffix = from.slice(-10);
        const phoneRegex = new RegExp(phoneSuffix + '$');
        console.log(`[Webhook] Searching for phone suffix: ${phoneSuffix}`);

        const student = await Student.findOne({ phone: phoneRegex });
        
        if (student) {
          console.log(`[Webhook] Match Found! Student: ${student.name} (${student._id})`);
          student.messages.push({
            senderName: student.name,
            senderRole: 'STUDENT',
            content: msg_body,
            timestamp: new Date()
          });
          await student.save();
          console.log(`[Webhook] Message saved to student history.`);

          if (student.assignedCounsellor) {
            sendRealTimeNotification(student.assignedCounsellor, {
              title: `WhatsApp from ${student.name}`,
              message: msg_body,
              type: 'chat',
              metadata: { studentId: student._id, phone: from }
            });
          }
        } else {
          console.log(`[Webhook] No Student found. Checking Leads...`);
          const lead = await Lead.findOne({ phone: phoneRegex });
          if (lead) {
            console.log(`[Webhook] Match Found! Lead: ${lead.name}`);
            lead.notes.push(`[WhatsApp ${new Date().toISOString()}] ${msg_body}`);
            await lead.save();
            
            if (lead.assignedTo) {
              sendRealTimeNotification(lead.assignedTo, {
                title: `WhatsApp from Lead: ${lead.name}`,
                message: msg_body,
                type: 'chat',
                metadata: { leadId: lead._id, phone: from }
              });
            }
          } else {
            console.warn(`[Webhook] No student or lead found for phone suffix: ${phoneSuffix}`);
          }
        }
      }

      // Handle status updates
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.statuses
      ) {
        const statusUpdate = body.entry[0].changes[0].value.statuses[0];
        console.log(`[Webhook] Status Update: ${statusUpdate.id} -> ${statusUpdate.status}`);
        
        const { id, status, timestamp, errors } = statusUpdate;
        const updateData = { status: status };
        if (status === 'delivered') updateData.deliveredAt = new Date(parseInt(timestamp) * 1000);
        if (status === 'failed') {
          updateData.failedAt = new Date(parseInt(timestamp) * 1000);
          if (errors && errors.length > 0) updateData.metadata = { whatsappError: errors[0] };
        }
        await Notification.findOneAndUpdate({ whatsappMessageId: id }, updateData);
      }

      return res.status(200).send('EVENT_RECEIVED');
    } else {
      console.warn('[Webhook] Received event for non-whatsapp object:', body.object);
      return res.sendStatus(404);
    }
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    res.status(500).send('INTERNAL_SERVER_ERROR');
  }
};
