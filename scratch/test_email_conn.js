require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

async function testConnection() {
  console.log('Testing Email Configuration...');
  console.log('Host:', process.env.EMAIL_HOST);
  console.log('Port:', process.env.EMAIL_PORT);
  console.log('User:', process.env.EMAIL_USER);
  console.log('Pass Length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('✅ Connection successful!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.message.includes('Invalid login')) {
      console.error('TIP: Your email or password (App Password) is incorrect.');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('TIP: Connection timed out. Check your port (587) or firewall.');
    }
  }
}

testConnection();
