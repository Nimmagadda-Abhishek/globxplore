require('dotenv').config({ path: __dirname + '/../../.env' });
const mongoose = require('mongoose');
const User = require('../modules/user/model');
const connectDB = require('../config/db');

const resetDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to DB...');

    // Drop the entire database
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
      console.log('Database dropped successfully');
    }

    // Add one admin user
    const adminUser = new User({
      gxId: 'GXADMIN001',
      role: 'ADMIN',
      name: 'Super Admin',
      email: 'admin@globxplorer.com',
      phone: '+1234567890',
      password: 'adminpassword123',
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@globxplorer.com');
    console.log('Password: adminpassword123');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();
