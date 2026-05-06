const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function checkPayments() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Payment = require('../src/modules/payment/model');
  const Student = require('../src/modules/student/model');

  const allPayments = await Payment.find().lean();
  console.log(`\n--- Global Payments Collection (${allPayments.length} records) ---`);
  allPayments.forEach(p => {
    console.log(`ID: ${p._id}, GX: ${p.gxId}, Amount: ${p.amount}, Status: ${p.status}, Order: ${p.razorpayOrderId}`);
  });

  const studentsWithPayments = await Student.find({ 'payments.0': { $exists: true } }).lean();
  console.log(`\n--- Students with Local Payment Records (${studentsWithPayments.length} students) ---`);
  studentsWithPayments.forEach(s => {
    console.log(`Student: ${s.name} (${s.gxId})`);
    s.payments.forEach(p => {
      console.log(`  - Title: ${p.title}, Status: ${p.status}, Order: ${p.razorpayOrderId}`);
    });
  });

  process.exit(0);
}

checkPayments();
