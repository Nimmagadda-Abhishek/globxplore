const authService = require('../auth/service');
const User = require('../user/model');
const Lead = require('../lead/model');
const Student = require('../student/model');
const Payment = require('../payment/model');
const VisaProcess = require('../visa/model');

/**
 * Login admin using GX ID.
 * @route POST /api/admin/login
 */
exports.login = async (req, res, next) => {
  try {
    const { gxId, password } = req.body;

    if (!gxId || !password) {
      return res.status(400).json({ success: false, message: 'GX ID and password are required' });
    }

    const data = await authService.loginUser(gxId, password);

    // Ensure user has admin role
    if (data.user.role.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          gxId: data.user.gxId,
          name: data.user.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout current admin session.
 */
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns current logged-in admin profile.
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      success: true,
      data: {
        gxId: user.gxId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns KPI cards:
 * Total Leads, Active Students, Revenue, Visa Approved, Pending Follow-ups, Active Employees
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      newLeadsToday,
      activeStudents,
      applicationsSubmitted,
      offerLettersReceived,
      visaApproved,
      visaRefused,
      revenueDataMonth,
      pendingFollowUps,
      activeEmployees
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: todayStart } }),
      Student.countDocuments({ pipelineStage: { $nin: ['Departure', 'Alumni Tracking'] } }),
      Student.countDocuments({ pipelineStage: { $in: ['Application Started', 'Offer Received', 'Deposit payment', 'Interview', 'Unconditional offer', 'Uni fee payment', 'Loan Docs upload', 'Medical test report', 'Visa Filed', 'Visa Approved'] } }),
      Student.countDocuments({ pipelineStage: 'Offer Received' }),
      VisaProcess.countDocuments({ approvalStatus: 'Approved' }),
      VisaProcess.countDocuments({ approvalStatus: 'Not approved' }),
      Payment.aggregate([
        { $match: { status: 'Paid', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Lead.countDocuments({ followUpDate: { $lte: new Date() }, status: { $ne: 'Declined' } }),
      User.countDocuments({ role: { $nin: ['ADMIN', 'STUDENT'] }, isActive: true })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        newLeadsToday,
        activeStudents,
        applicationsSubmitted,
        offerLettersReceived,
        visaApproved,
        visaRefused,
        revenueThisMonth: revenueDataMonth[0] ? revenueDataMonth[0].total : 0,
        pendingFollowUps,
        activeEmployees
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns chart data:
 * Leads vs Conversion, Revenue Trend, Country Applications, Team Comparison
 */
exports.getDashboardCharts = async (req, res, next) => {
  try {
    const countryApplications = await Student.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const revenueTrend = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        countryApplications,
        revenueTrend
      }
    });
  } catch (error) {
    next(error);
  }
};
