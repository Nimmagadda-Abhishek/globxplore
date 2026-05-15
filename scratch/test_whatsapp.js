require('dotenv').config();
const WhatsAppProvider = require('../src/modules/notification/whatsapp.provider');

async function testWhatsApp() {
  console.log('Testing WhatsApp Notification...');
  console.log('Config:', {
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.WHATSAPP_ACCESS_TOKEN ? 'Present (length: ' + process.env.WHATSAPP_ACCESS_TOKEN.length + ')' : 'Missing'
  });

  const result = await WhatsAppProvider.sendMessage('8328226265', 'Test WhatsApp message from GlobXplorer system.');

  if (result.success) {
    console.log('✅ WhatsApp sent successfully!', result.data);
  } else {
    console.error('❌ WhatsApp sending failed:', result.error);
  }
}

testWhatsApp().catch(console.error);
