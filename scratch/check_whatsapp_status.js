const mongoose = require('mongoose');
require('dotenv').config();

async function checkWhatsAppStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Notification = require('../src/modules/notification/model');
    
    const logs = await Notification.find({ 
      channels: 'whatsapp', 
      whatsappMessageId: { $exists: true } 
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log('WhatsApp Delivery Logs:');
    logs.forEach(l => {
      console.log(`- ID: ${l._id}`);
      console.log(`  Title: ${l.title}`);
      console.log(`  Status: ${l.status}`);
      console.log(`  WhatsApp ID: ${l.whatsappMessageId}`);
      console.log(`  Metadata: ${JSON.stringify(l.metadata)}`);
      console.log('---');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkWhatsAppStatus();
