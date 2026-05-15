require('dotenv').config();
const EmailProvider = require('../src/modules/notification/email.provider');

async function testEmail() {
  console.log('Testing Email Notification with new credentials...');
  
  const result = await EmailProvider.sendEmail({
    to: 'abhishek.nimmagadda.work@gmail.com',
    subject: 'Verified: Email Notification Working',
    html: '<h1>Success!</h1><p>The email notification system is now working properly with the new App Password.</p>'
  });

  if (result.success) {
    console.log('✅ Email sent successfully!', result.messageId);
  } else {
    console.error('❌ Email sending failed:', result.error);
  }
}

testEmail().catch(console.error);
