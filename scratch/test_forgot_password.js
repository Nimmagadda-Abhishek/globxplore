const mongoose = require('mongoose');
const authService = require('../src/modules/auth/service');
const User = require('../src/modules/user/model');
require('dotenv').config();

async function testForgotPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin user
    const admin = await User.findOne({ role: 'ADMIN' });
    if (!admin) {
      console.log('Admin user not found. Cannot test.');
      return;
    }

    const identifier = admin.gxId;
    console.log(`\nTesting Forgot Password for ${identifier} (${admin.email})...`);

    // 1. Generate OTP
    console.log('\n--- Step 1: Generate OTP ---');
    await authService.generateForgotPasswordOtp(identifier);
    
    // Fetch user from DB to see the OTP
    const updatedUser = await User.findById(admin._id);
    const otp = updatedUser.resetPasswordOtp;
    console.log(`Generated OTP: ${otp}`);
    console.log(`OTP Expires: ${updatedUser.resetPasswordOtpExpires}`);

    // 2. Verify OTP (Failure Case)
    console.log('\n--- Step 2: Verify Incorrect OTP ---');
    try {
      await authService.verifyForgotPasswordOtp(identifier, '000000');
      console.error('FAILED: Incorrect OTP should not be verified');
    } catch (err) {
      console.log('SUCCESS: Incorrect OTP blocked:', err.message);
    }

    // 3. Verify OTP (Success Case)
    console.log('\n--- Step 3: Verify Correct OTP ---');
    const verifyResult = await authService.verifyForgotPasswordOtp(identifier, otp);
    console.log('SUCCESS:', verifyResult.message);

    // 4. Reset Password
    console.log('\n--- Step 4: Reset Password ---');
    const newPassword = 'NewPassword2026!';
    const resetResult = await authService.resetPasswordWithOtp(identifier, otp, newPassword);
    console.log('SUCCESS:', resetResult.message);

    // Verify OTP is cleared
    const finalUser = await User.findById(admin._id);
    if (!finalUser.resetPasswordOtp && !finalUser.resetPasswordOtpExpires) {
      console.log('OTP fields successfully cleared.');
    } else {
      console.error('FAILED: OTP fields were not cleared.');
    }

    // Restore old password (MooN@2026) for testing continuity
    console.log('\n--- Cleaning up: Restoring original password ---');
    finalUser.password = 'MooN@2026';
    await finalUser.save();
    console.log('Original password restored.');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testForgotPassword();
