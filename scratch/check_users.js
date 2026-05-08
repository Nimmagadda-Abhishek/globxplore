const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require(path.resolve(__dirname, '../src/modules/user/model'));
    const users = await User.find({ phone: { $exists: true } }).limit(5);
    console.log(JSON.stringify(users.map(u => ({ id: u._id, name: u.name, phone: u.phone, role: u.role })), null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
