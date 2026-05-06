const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/modules/user/model');
const Notification = require('../src/modules/notification/model');
const notificationService = require('../src/modules/notification/service');

async function testWhatsApp() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const admin = await User.findOne({ role: 'ADMIN' });
        if (!admin) {
            console.error('No ADMIN user found');
            return;
        }

        console.log(`Found Admin: ${admin.name} (${admin.phone})`);

        // Trigger a notification specifically for WhatsApp
        const notification = await notificationService.triggerNotification({
            userId: admin._id,
            eventKey: 'SYSTEM_ALERT',
            data: { message: 'WhatsApp Test at ' + new Date().toISOString() },
            channels: ['whatsapp']
        });

        console.log('WhatsApp Notification triggered:', notification._id);

        // Wait a bit for processing
        await new Promise(r => setTimeout(r, 2000));

        // Check status
        const updated = await Notification.findById(notification._id);
        console.log('Status after 2s:', updated.status);
        console.log('Results:', updated.metadata);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testWhatsApp();
