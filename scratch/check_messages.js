const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function checkStudentMessages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Student = require(path.resolve(__dirname, '../src/modules/student/model'));
    const student = await Student.findOne({ phone: /7995936112$/ });
    if (student) {
      console.log(`Student: ${student.name}`);
      console.log('Messages:', JSON.stringify(student.messages, null, 2));
    } else {
      console.log('Student not found');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkStudentMessages();
