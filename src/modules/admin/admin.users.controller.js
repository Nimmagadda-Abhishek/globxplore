const User = require('../user/model');
const authService = require('../auth/service');
const { sendWelcomeEmail } = require('../notification/service');

/**
 * Create any user.
 */
exports.createUser = async (req, res, next) => {
  try {
    const { role, name, email, phone } = req.body;

    if (!role || !name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Role, name, email, and phone are required' });
    }

    const user = await authService.registerUser({
      role: role.toUpperCase(),
      name,
      email,
      phone
    });

    // Send welcome email with credentials (non-blocking)
    if (user._autoPassword) {
      sendWelcomeEmail({ email, name, gxId: user.gxId, password: user._autoPassword, role: role.toUpperCase() });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        gxId: user.gxId,
        password: user._autoPassword
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a Counsellor.
 */
exports.createCounsellor = async (req, res, next) => {
  try {
    req.body.role = 'COUNSELLOR';
    return exports.createUser(req, res, next);
  } catch (error) {
    next(error);
  }
};


/**
 * List users with filters.
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20, search, status } = req.query;
    const query = {};

    if (role) query.role = role.toUpperCase();
    if (status) query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gxId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalUsers: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user detail.
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile.
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enable / Disable user.
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const isActive = status === 'active';
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { returnDocument: 'after' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password and issue new temporary password.
 */
exports.resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newPassword = Math.random().toString(36).slice(-8);
    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        gxId: user.gxId,
        temporaryPassword: newPassword
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user password and/or email by admin.
 */
exports.updateUserPasswordEmail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { password, email } = req.body;

    if (!password && !email) {
      return res.status(400).json({ success: false, message: 'Please provide password or email to update' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }

    if (password) {
      user.password = password;
      user.mustChangePassword = false;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User credentials updated successfully',
      data: {
        gxId: user.gxId,
        email: user.email,
        updated: {
          password: !!password,
          email: !!email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lock or unlock a user account.
 */
exports.lockUnlockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let isLocked = req.body.isLocked;

    // Check query params if not in body
    if (isLocked === undefined && req.query.isLocked !== undefined) {
      isLocked = req.query.isLocked;
    }

    // Convert string representations to boolean
    if (typeof isLocked === 'string') {
      const normalized = isLocked.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        isLocked = true;
      } else if (normalized === 'false' || normalized === '0') {
        isLocked = false;
      }
    }

    // Default to true (locking the user) if not provided, since the endpoint is /lock
    if (isLocked === undefined) {
      isLocked = true;
    }

    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isLocked must be a boolean value or boolean string' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isLocked } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: `User ${isLocked ? 'locked' : 'unlocked'} successfully`,
      data: {
        gxId: user.gxId,
        name: user.name,
        isLocked: user.isLocked
      }
    });
  } catch (error) {
    next(error);
  }
};
