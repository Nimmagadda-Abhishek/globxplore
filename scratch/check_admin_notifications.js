const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function checkAdminNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Notification = require(path.resolve(__dirname, '../src/modules/notification/model'));
    const notifications = await Notification.find({ title: 'Unknown WhatsApp Message' }).sort({ createdAt: -1 }).limit(1);
    console.log('Notifications:', JSON.stringify(notifications, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAdminNotifications();
