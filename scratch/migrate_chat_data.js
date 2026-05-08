const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('../src/modules/student/model');
const VisaProcess = require('../src/modules/visa/model');
const Lead = require('../src/modules/lead/model');

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for migration...');

    // 1. Migrate Students
    const students = await Student.find({});
    console.log(`Processing ${students.length} students...`);
    for (let s of students) {
      let modified = false;
      s.messages.forEach(m => {
        if (!m.sender) {
          // Fallback logic for old structure
          m.sender = (m.senderRole === 'STUDENT') ? 'student' : 'agent';
          m.text = m.text || m.content;
          modified = true;
        }
      });
      if (modified) await s.save();
    }

    // 2. Migrate Visa Processes
    const visas = await VisaProcess.find({});
    console.log(`Processing ${visas.length} visa processes...`);
    for (let v of visas) {
      let modified = false;
      v.messages.forEach(m => {
        if (!m.sender) {
          m.sender = (m.senderRole === 'STUDENT' || m.senderRole === 'VISA_CLIENT') ? 'student' : 'agent';
          m.text = m.text || m.content;
          modified = true;
        }
      });
      if (modified) await v.save();
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
