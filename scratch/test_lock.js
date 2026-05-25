const mongoose = require('mongoose');
const path = require('path');
const User = require(path.join(__dirname, '..', 'src', 'modules', 'user', 'model'));
require('dotenv').config();

async function testLock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userId = '6a14028f90e5b33e6bdfcde8';
    
    // First, check current status
    let user = await User.findById(userId);
    console.log('Before update, isLocked:', user.isLocked);

    // Try locking
    user.isLocked = true;
    await user.save();
    
    user = await User.findById(userId);
    console.log('After update to true, isLocked:', user.isLocked);

    // Try unlocking
    user.isLocked = false;
    await user.save();
    
    user = await User.findById(userId);
    console.log('After update to false, isLocked:', user.isLocked);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testLock();
