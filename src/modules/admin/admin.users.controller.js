const User = require('../user/model');
const authService = require('../auth/service');

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

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        gxId: user.gxId,
        password: user._autoPassword // Temporary password for admin to share
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
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
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
