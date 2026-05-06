const mongoose = require('mongoose');
const path = require('path');
const User = require(path.join(__dirname, '..', 'src', 'modules', 'user', 'model'));
require('dotenv').config();

async function seedAllUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const usersToSeed = [
      {
        gxId: 'GXAD73291673',
        name: 'Global Admin',
        email: 'admin@globxplorer.com',
        phone: '1234567890',
        role: 'ADMIN',
        password: 'adminpassword123',
        isActive: true
      },
      {
        gxId: 'GXAM14538232',
        name: 'Agent Manager',
        email: 'am@globxplorer.com',
        phone: '1234567891',
        role: 'AGENT_MANAGER',
        password: '57f02251',
        isActive: true
      },
      {
        gxId: 'GXAG22396041',
        name: 'Abhi Agent',
        email: 'abhi@agent.com',
        phone: '1234567892',
        role: 'AGENT',
        password: 'Abhi@1724',
        isActive: true
      },
      {
        gxId: 'GXTC66291309',
        name: 'Telecaller',
        email: 'tc@globxplorer.com',
        phone: '1234567893',
        role: 'TELECALLER',
        password: '94ce02ef',
        isActive: true
      },
      {
        gxId: 'GXVA23008154',
        name: 'Visa Agent',
        email: 'va@globxplorer.com',
        phone: '1234567894',
        role: 'VISA_AGENT',
        password: '1669dcdf',
        isActive: true
      }
    ];

    for (const userData of usersToSeed) {
      const existingUser = await User.findOne({ gxId: userData.gxId });
      if (existingUser) {
        console.log(`User ${userData.gxId} already exists. Updating...`);
        existingUser.password = userData.password;
        await existingUser.save();
      } else {
        console.log(`Creating user ${userData.gxId}...`);
        await User.create(userData);
      }
    }

    console.log('All users seeded successfully.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

seedAllUsers();
