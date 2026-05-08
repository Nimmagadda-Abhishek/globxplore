const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function testFirstLoginNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const authService = require(path.resolve(__dirname, '../src/modules/auth/service'));
    const User = require(path.resolve(__dirname, '../src/modules/user/model'));
    
    const testPhone = '9999999999';
    // Cleanup
    await User.deleteOne({ phone: testPhone });

    console.log('Registering test user...');
    const user = await authService.registerUser({
      name: 'Test First Login',
      email: 'firstlogin@test.com',
      phone: testPhone,
      role: 'STUDENT',
      password: 'testpassword123'
    });

    console.log('Logging in for the first time...');
    await authService.loginUser(user.gxId, 'testpassword123');
    
    const Notification = require(path.resolve(__dirname, '../src/modules/notification/model'));
    const notification = await Notification.findOne({ userId: user._id }).sort({ createdAt: -1 });
    console.log('Latest Notification Created:', JSON.stringify(notification, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testFirstLoginNotification();
