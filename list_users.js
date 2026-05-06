require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/user/model');

async function listUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}, 'gxId email role');
  console.log(users);
  await mongoose.disconnect();
}

listUsers();
