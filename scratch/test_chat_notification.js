const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function testCounsellorMessageNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Student = require(path.resolve(__dirname, '../src/modules/student/model'));
    const studentController = require(path.resolve(__dirname, '../src/modules/student/controller'));
    
    const student = await Student.findOne({ phone: /7995936112$/ });
    if (!student) {
      console.log('Test student not found');
      process.exit(1);
    }

    const req = {
      params: { id: student._id },
      body: { content: 'This is a test message from your counsellor.' },
      user: { _id: '69f1cd5eaa33c7ed816cdcd0', name: 'Abhishekl', role: 'COUNSELLOR' }
    };

    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`Status: ${code}`);
        }
      })
    };

    const next = (err) => console.error('Next called with error:', err);

    console.log('Adding counsellor message...');
    await studentController.addMessage(req, res, next);
    
    const Notification = require(path.resolve(__dirname, '../src/modules/notification/model'));
    const notification = await Notification.findOne({ userId: student.userId }).sort({ createdAt: -1 });
    console.log('Latest Notification Created:', JSON.stringify(notification, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testCounsellorMessageNotification();
