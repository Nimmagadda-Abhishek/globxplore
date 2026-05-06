const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/modules/user/model');
const Notification = require('../src/modules/notification/model');
const notificationService = require('../src/modules/notification/service');

async function testNotification() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const admin = await User.findOne({ role: 'ADMIN' });
        if (!admin) {
            console.error('No ADMIN user found');
            return;
        }

        console.log(`Found Admin: ${admin.name} (${admin._id})`);

        // Trigger a notification
        const notification = await notificationService.triggerNotification({
            userId: admin._id,
            eventKey: 'SYSTEM_ALERT',
            data: { message: 'Test Notification at ' + new Date().toISOString() },
            channels: ['app', 'email']
        });

        console.log('Notification triggered:', notification._id);

        // Wait a bit for processing
        await new Promise(r => setTimeout(r, 2000));

        // Check status
        const updated = await Notification.findById(notification._id);
        console.log('Status after 2s:', updated.status);
        console.log('Channels attempted:', updated.channels);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testNotification();
