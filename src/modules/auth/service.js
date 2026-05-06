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

  const accessToken = this.generateToken(user._id, 'access');
  const refreshToken = this.generateToken(user._id, 'refresh');

  user.lastLogin = new Date();
  await user.save();

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
