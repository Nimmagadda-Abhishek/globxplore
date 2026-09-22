const User = require('../user/model');
const authService = require('../auth/service');
const { sendWelcomeEmail } = require('../notification/service');
const { AlumniRegistration, StudentRequest, ServiceRequest } = require('../alumni/model');

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

    // Send welcome email with credentials (non-blocking)
    if (user._autoPassword) {
      sendWelcomeEmail({ email, name, gxId: user.gxId, password: user._autoPassword, role: 'Alumni Manager' });
    }

    res.status(201).json({
      success: true,
      message: 'Alumni Manager created successfully',
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
    const manager = await User.findOne({ _id: req.params.id, role: 'ALUMNI_MANAGER' }).select('_id createdAt');
    if (!manager) return res.status(404).json({ success: false, message: 'Alumni Manager not found' });

    const weeklyTarget = Math.max(Number(req.query.weeklyTarget) || 20, 1);
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const managerId = manager._id;

    const [approvedAlumni, approvedRegistrations, resolvedRequests, handledServiceRequests, weeklyApproved, weeklyHandled] = await Promise.all([
      User.countDocuments({ role: 'ALUMNI', approvedBy: managerId }),
      AlumniRegistration.countDocuments({ approvedBy: managerId }),
      StudentRequest.countDocuments({ handledBy: managerId, status: 'Resolved' }),
      ServiceRequest.countDocuments({ handledBy: managerId, status: { $in: ['Approved', 'Rejected', 'Completed'] } }),
      User.countDocuments({ role: 'ALUMNI', approvedBy: managerId, approvedAt: { $gte: weekStart } }),
      Promise.all([
        StudentRequest.countDocuments({ handledBy: managerId, handledAt: { $gte: weekStart } }),
        ServiceRequest.countDocuments({ handledBy: managerId, handledAt: { $gte: weekStart } })
      ]).then(([student, service]) => student + service)
    ]);

    const alumniApproved = approvedAlumni + approvedRegistrations;
    const requestsHandled = resolvedRequests + handledServiceRequests;
    const totalReviewed = alumniApproved + requestsHandled;
    const approvalEfficiency = totalReviewed ? Math.round((alumniApproved / totalReviewed) * 100) : 0;
    const weeklyCompleted = weeklyApproved + weeklyHandled;

    res.status(200).json({
      success: true,
      data: {
        alumniApproved,
        requestsHandled,
        approvalEfficiency,
        weeklyTarget,
        weeklyCompleted,
        weeklyProgress: Math.min(Math.round((weeklyCompleted / weeklyTarget) * 100), 100),
        activeSince: manager.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
