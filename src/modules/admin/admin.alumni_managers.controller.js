const User = require('../user/model');
const authService = require('../auth/service');

/**
 * Create a new Alumni Manager.
 * @route POST /api/admin/alumni-managers
 */
exports.createAlumniManager = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, and phone are required' });
    }

    const user = await authService.registerUser({
      role: 'ALUMNI_MANAGER',
      name,
      email,
      phone
    });

    res.status(201).json({
      success: true,
      message: 'Alumni Manager created successfully',
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
 * List all Alumni Managers.
 * @route GET /api/admin/alumni-managers
 */
exports.getAlumniManagers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = { role: 'ALUMNI_MANAGER' };

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
 * Get an Alumni Manager by ID.
 * @route GET /api/admin/alumni-managers/:id
 */
exports.getAlumniManagerById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'ALUMNI_MANAGER') {
      return res.status(404).json({ success: false, message: 'Alumni Manager not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Alumni Manager status.
 * @route PATCH /api/admin/alumni-managers/:id/status
 */
exports.updateAlumniManagerStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!user || user.role !== 'ALUMNI_MANAGER') {
      return res.status(404).json({ success: false, message: 'Alumni Manager not found' });
    }

    res.status(200).json({ success: true, message: 'Status updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Alumni Manager Analytics.
 * @route GET /api/admin/alumni-managers/:id/analytics
 */
exports.getAlumniManagerAnalytics = async (req, res, next) => {
  try {
    // Basic analytics placeholder
    res.status(200).json({
      success: true,
      data: {
        alumniApproved: 0,
        requestsHandled: 0,
        activeSince: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};
