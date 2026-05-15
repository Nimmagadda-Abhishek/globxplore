const authService = require('./service');

/**
 * Register a user and respond with GX ID.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
exports.register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: `User registered successfully.${user._autoPassword ? ` Password: ${user._autoPassword}` : ''}`,
      data: {
        gxId: user.gxId,
        name: user.name,
        role: user.role,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
        autoPassword: user._autoPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user via GX ID/email and password.
 * Accepts identifier in gxId, email, id, userId, identifier, or username.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
exports.login = async (req, res, next) => {
  try {
    const {
      gxId,
      email,
      id,
      userId,
      identifier,
      username,
      password,
    } = req.body;

    const loginIdentifier = gxId || email || id || userId || identifier || username;
    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Login ID/email and password are required' });
    }

    const data = await authService.loginUser(loginIdentifier, password);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user and close attendance session.
 */
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await authService.logoutUser(req.user._id);
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change the authenticated user's password.
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both old and new passwords' });
    }

    const data = await authService.changeUserPassword(req.user._id, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle forgot password request.
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please provide your GX ID or email' });
    }

    const data = await authService.generateForgotPasswordOtp(identifier);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP.
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ success: false, message: 'Identifier and OTP are required' });
    }

    const data = await authService.verifyForgotPasswordOtp(identifier, otp);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Identifier, OTP, and new password are required' });
    }

    const data = await authService.resetPasswordWithOtp(identifier, otp, newPassword);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
