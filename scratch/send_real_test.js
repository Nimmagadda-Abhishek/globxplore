require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const notificationService = require('../src/modules/notification/service');

async function testRealNotification() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const testUserId = '69f1ccaf370e514e78d0a276';
    console.log(`Triggering test notification to user: ${testUserId}`);

    // Trigger a SYSTEM_ALERT event
    const notification = await notificationService.triggerNotification({
      userId: testUserId, 
      eventKey: 'SYSTEM_ALERT',
      data: {
        message: 'This is a real test notification from GlobXplorer! Your email configuration is now working correctly.',
        time: new Date().toLocaleTimeString()
      },
      channels: ['email'] // Only test email for now
    });

    console.log('✅ Notification triggered and queued.');
    console.log('Notification ID:', notification._id);
    
    console.log('\nWait for about 5-10 seconds for the engine to process it...');
    
    setTimeout(async () => {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('❌ Error triggering notification:', error.message);
    process.exit(1);
  }
}

testRealNotification();
