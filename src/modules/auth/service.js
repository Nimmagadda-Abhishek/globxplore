const jwt = require('jsonwebtoken');
const User = require('../user/model');
const { generateGxId } = require('../../utils/gxIdGenerator');
const { Session } = require('../activity/model');

const crypto = require('crypto');

/**
 * Register a new user and generate a GX ID.
 * @param {Object} userData - User data (name, email, phone, role, password).
 * @returns {Promise<Object>} - The created user.
 */
exports.registerUser = async (userData) => {
  // Check if phone number is already registered
  const existingUser = await User.findOne({ phone: userData.phone });
  if (existingUser) {
    const error = new Error('Phone number is already registered');
    error.status = 400;
    throw error;
  }

  const gxId = await generateGxId(userData.role);
  
  let { password } = userData;
  let mustChangePassword = false;

  // Auto-generate password if none provided
  if (!password) {
    password = crypto.randomBytes(4).toString('hex');
    mustChangePassword = true;
  }

  const user = await User.create({ 
    ...userData, 
    gxId, 
    password,
    mustChangePassword
  });

  // Attach the auto-password to the user object (temporarily) for the caller to see
  if (mustChangePassword) {
    user._autoPassword = password;
  }

  return user;
};

/**
 * Login user using GX ID/email and password.
 * @param {string} identifier - GX ID or email.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} - User and tokens.
 */
exports.loginUser = async (identifier, password) => {
  const normalized = String(identifier).trim();
  const normalizedEmail = normalized.toLowerCase();
  const normalizedGxId = normalized.toUpperCase();

  const user = await User.findOne({
    $or: [
      { gxId: normalized },
      { gxId: normalizedGxId },
      { email: normalized },
      { email: normalizedEmail },
    ],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    const error = new Error('Invalid login ID/email or password');
    error.status = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account has been deactivated. Please contact support.');
    error.status = 403;
    throw error;
  }

  if (!user.isApproved) {
    const error = new Error('Your account is pending approval by the administrator.');
    error.status = 403;
    throw error;
  }


  const accessToken = this.generateToken(user._id, 'access');
  const refreshToken = this.generateToken(user._id, 'refresh');

  const isFirstLogin = !user.lastLogin;
  user.lastLogin = new Date();
  await user.save();

  // If first time login, send WhatsApp reminder to change password
  if (isFirstLogin) {
    try {
      const notificationService = require('../notification/service');
      await notificationService.sendRawNotification({
        userId: user._id,
        title: 'Security Reminder: Change Your Password',
        message: `Hi ${user.name}, welcome to GlobXplorer! For your security, please change your temporary password from the profile settings.`,
        channels: ['app', 'whatsapp'],
        metadata: {
          event: 'first_login',
          gxId: user.gxId
        }
      });
    } catch (err) {
      console.error('Failed to send first-login WhatsApp reminder:', err.message);
    }
  }

  // Create attendance session for staff roles
  const staffRoles = ['ADMIN', 'AGENT_MANAGER', 'AGENT', 'TELECALLER', 'COUNSELLOR', 'VISA_AGENT', 'ALUMNI_MANAGER'];
  if (staffRoles.includes(user.role.toUpperCase())) {
    try {
      // Close any existing open sessions first (safety check)
      await Session.updateMany(
        { userId: user._id, logoutTime: { $exists: false } },
        { $set: { logoutTime: new Date(), status: 'logged_out' } }
      );

      // Start new session
      await Session.create({
        userId: user._id,
        gxId: user.gxId,
        loginTime: new Date(),
        status: 'active',
        activeTime: 0,
        idleTime: 0
      });
    } catch (sessionError) {
      console.error('Failed to create attendance session:', sessionError);
      // Don't fail the login if session creation fails
    }
  }

  return {
    user: {
      gxId: user.gxId,
      name: user.name,
      role: user.role,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      isFirstLogin,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Logout a user and close their attendance session.
 * @param {string} userId - User ID to logout.
 */
exports.logoutUser = async (userId) => {
  const staffRoles = ['ADMIN', 'AGENT_MANAGER', 'AGENT', 'TELECALLER', 'COUNSELLOR', 'VISA_AGENT', 'ALUMNI_MANAGER'];
  
  // Find the user to check their role
  const user = await User.findById(userId);
  if (user && staffRoles.includes(user.role.toUpperCase())) {
    await Session.updateMany(
      { userId, logoutTime: { $exists: false } },
      { 
        $set: { 
          logoutTime: new Date(), 
          status: 'logged_out' 
        } 
      }
    );
  }
  return true;
};

/**
 * Generate JWT token.
 * @param {string} userId - User ID.
 * @param {string} type - Token type ('access' or 'refresh').
 * @returns {string} - The JWT token.
 */
exports.generateToken = (userId, type) => {
  const secret = type === 'access' ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;
  const expires = type === 'access' ? '1d' : '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn: expires });
};

/**
 * Change a user's password.
 * @param {string} userId - The unique user ID.
 * @param {string} oldPassword - The user's current password.
 * @param {string} newPassword - The new password.
 * @returns {Promise<Object>} - Success message.
 */
exports.changeUserPassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  
  if (!user || !(await user.comparePassword(oldPassword))) {
    throw new Error('Invalid current password');
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  return { message: 'Password changed successfully' };
};

/**
 * Generate a 6-digit OTP for password reset and send via email.
 * @param {string} identifier - GX ID or email.
 */
exports.generateForgotPasswordOtp = async (identifier) => {
  const normalized = String(identifier).trim();
  const normalizedEmail = normalized.toLowerCase();
  const normalizedGxId = normalized.toUpperCase();

  const user = await User.findOne({
    $or: [
      { gxId: normalized },
      { gxId: normalizedGxId },
      { email: normalized },
      { email: normalizedEmail },
    ],
  });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  user.resetPasswordOtp = otp;
  // OTP expires in 10 minutes
  user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60000);
  await user.save();

  // Send Email
  try {
    const notificationService = require('../notification/service');
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Here is your 6-digit OTP:</p>
        <h1 style="color: #4A90E2; letter-spacing: 2px;">${otp}</h1>
        <p>This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
      </div>
    `;
    await notificationService.sendEmail(user.email, 'GlobXplorer - Password Reset OTP', emailHtml);
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
    const emailError = new Error('Failed to send OTP email. Please try again later.');
    emailError.status = 500;
    throw emailError;
  }

  return { message: 'OTP sent to your registered email' };
};

/**
 * Verify the OTP.
 */
exports.verifyForgotPasswordOtp = async (identifier, otp) => {
  const normalized = String(identifier).trim();
  const normalizedEmail = normalized.toLowerCase();
  const normalizedGxId = normalized.toUpperCase();

  const user = await User.findOne({
    $or: [
      { gxId: normalized },
      { gxId: normalizedGxId },
      { email: normalized },
      { email: normalizedEmail },
    ],
  });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (user.resetPasswordOtp !== String(otp)) {
    const error = new Error('Invalid OTP');
    error.status = 400;
    throw error;
  }

  if (user.resetPasswordOtpExpires < new Date()) {
    const error = new Error('OTP has expired');
    error.status = 400;
    throw error;
  }

  return { success: true, message: 'OTP verified successfully' };
};

/**
 * Reset the password using a valid OTP.
 */
exports.resetPasswordWithOtp = async (identifier, otp, newPassword) => {
  // First, verify the OTP again to be safe
  await this.verifyForgotPasswordOtp(identifier, otp);

  const normalized = String(identifier).trim();
  const normalizedEmail = normalized.toLowerCase();
  const normalizedGxId = normalized.toUpperCase();

  const user = await User.findOne({
    $or: [
      { gxId: normalized },
      { gxId: normalizedGxId },
      { email: normalized },
      { email: normalizedEmail },
    ],
  });

  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpires = undefined;
  await user.save();

  return { success: true, message: 'Password has been reset successfully' };
};
