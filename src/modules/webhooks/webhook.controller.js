const Student = require('../student/model');
const Lead = require('../lead/model');
const WhatsAppProvider = require('../../providers/WhatsAppProvider');

/**
 * GET /api/webhooks/whatsapp
 * Verify token handshake for Meta
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
      console.log('Webhook Verified Successfully');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
};

/**
 * POST /api/webhooks/whatsapp
 * Handle incoming messages from Meta
 */
exports.handleWebhook = async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const io = req.app.get('io');

    if (message && message.type === 'text') {
      const phone = message.from; // e.g. "919876543210"
      const text = message.text.body;
      const suffix = phone.slice(-10); // Extract last 10 digits

      console.log(`Incoming message from ${phone}: ${text}`);

      // 1. Search Student
      let record = await Student.findOne({ phone: { $regex: new RegExp(`${suffix}$`) } });
      let model = 'Student';

      // 2. If not found, search Lead
      if (!record) {
        record = await Lead.findOne({ phone: { $regex: new RegExp(`${suffix}$`) } });
        model = 'Lead';
      }

      if (record) {
        // 3. Push to messages[]
        record.messages.push({
          sender: 'student',
          text,
          timestamp: new Date(),
          status: 'received'
        });
        record.lastMessageAt = new Date();
        await record.save();

        // 4. Emit Socket.io event to assigned agent
        const assignedTo = record.assignedCounsellor || record.assignedAgent || record.assignedTo;
        if (assignedTo && io) {
          io.to(`agent_${assignedTo}`).emit('incoming_message', {
            recordId: record._id,
            model,
            sender: record.name,
            text,
            timestamp: new Date()
          });
        }
      } else {
        console.warn(`No student or lead found for phone suffix: ${suffix}`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Error:', error);
    res.sendStatus(200); // Always return 200 to Meta to avoid retries
  }
};
