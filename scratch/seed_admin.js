const mongoose = require('mongoose');
const path = require('path');
const User = require(path.join(__dirname, '..', 'src', 'modules', 'user', 'model'));
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminData = {
      gxId: 'GXAD73291673',
      name: 'Nagaraju',
      email: 'admin.globxplore@gmail.com',
      phone: '8328226265',
      role: 'ADMIN',
      password: 'MooN@2026',
      isActive: true
    };

    const existingAdmin = await User.findOne({ gxId: adminData.gxId });
    if (existingAdmin) {
      console.log('Admin already exists. Updating password...');
      existingAdmin.password = adminData.password;
      await existingAdmin.save();
      console.log('Admin updated.');
    } else {
      console.log('Creating new Admin...');
      await User.create(adminData);
      console.log('Admin created.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

seedAdmin();
