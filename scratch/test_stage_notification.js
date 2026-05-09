const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function testStageUpdateNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Student = require(path.resolve(__dirname, '../src/modules/student/model'));
    const studentController = require(path.resolve(__dirname, '../src/modules/student/controller'));
    
    // Mock req, res, next
    const student = await Student.findOne({ phone: /8008349568$/ });
    if (!student) {
      console.log('Test student not found');
      process.exit(1);
    }

    const req = {
      params: { id: student._id },
      body: { stage: 'Interested', notes: 'Testing notification' },
      user: { _id: '69f1ccaf370e514e78d0a276', name: 'Admin', role: 'ADMIN' }
    };

    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`Status: ${code}`);
          console.log('Data:', JSON.stringify(data, null, 2));
        }
      })
    };

    const next = (err) => console.error('Next called with error:', err);

    console.log('Triggering stage update...');
    await studentController.updateStage(req, res, next);
    
    // Give some time for the queue to process (though we don't have BullMQ worker running in this script)
    // We just want to see if the notification record was created in DB
    const Notification = require(path.resolve(__dirname, '../src/modules/notification/model'));
    const notification = await Notification.findOne({ userId: student.userId }).sort({ createdAt: -1 });
    console.log('Latest Notification Created:', JSON.stringify(notification, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testStageUpdateNotification();
