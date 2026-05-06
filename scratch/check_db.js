const mongoose = require('mongoose');
const path = require('path');
const User = require(path.join(__dirname, '..', 'src', 'modules', 'user', 'model'));

require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const usersToCheck = [
      { gxId: 'GXAD73291673', role: 'ADMIN' },
      { gxId: 'GXAM14538232', role: 'AGENT_MANAGER' },
      { gxId: 'GXAG22396041', role: 'AGENT' },
      { gxId: 'GXTC66291309', role: 'TELECALLER' },
      { gxId: 'GXVA23008154', role: 'VISA_AGENT' }
    ];

    for (const u of usersToCheck) {
      const user = await User.findOne({ gxId: u.gxId });
      console.log(`User ${u.gxId} (${u.role}):`, user ? 'Found' : 'Not Found');
    }


    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
