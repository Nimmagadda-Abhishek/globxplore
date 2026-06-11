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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // 1. Leads vs Conversions (Monthly)
    const leadsRaw = await Lead.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          leads: { $sum: 1 },
          conversions: {
            $sum: { $cond: [{ $in: ["$status", ["Qualified", "Ready to Apply"]] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    const leadsVsConversions = leadsRaw.map(item => ({
      month: months[item._id - 1] || 'Unknown',
      leads: item.leads,
      conversions: item.conversions
    }));

    // 2. Country-wise Applications
    const countryRaw = await Student.aggregate([
      { $group: { _id: "$interestedCountry", value: { $sum: 1 } } },
      { $match: { _id: { $ne: null }, value: { $gt: 0 } } },
      { $sort: { value: -1 } },
      { $limit: 5 }
    ]);
    const countryWiseApplications = countryRaw.map(item => ({
      name: item._id || 'Other',
      value: item.value
    }));

    // 3. Latest Revenue (Weekly)
    const revenueRaw = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      {
        $group: {
          _id: { $isoWeek: "$createdAt" },
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": -1 } },
      { $limit: 4 }
    ]);
    const latestRevenue = revenueRaw.map((item, index) => ({
      name: `Week ${index + 1}`, // Simplification for UI
      revenue: item.revenue
    })).reverse(); // Reverse to get chronological order

    // 4. Visa Approval Rate
    const visaRaw = await VisaProcess.aggregate([
      { $match: { approvalStatus: { $in: ['Approved', 'Not approved'] } } },
      {
        $group: {
          _id: "$approvalStatus",
          value: { $sum: 1 }
        }
      }
    ]);
    const visaApprovalRate = visaRaw.map(item => ({
      name: item._id === 'Not approved' ? 'Rejected' : item._id,
      value: item.value
    }));

    // 5. Active Students (Monthly Growth)
    const activeRaw = await Student.aggregate([
      { $match: { pipelineStage: { $nin: ['Enrolled', 'Alumni Tracking'] } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    const activeStudents = activeRaw.map(item => ({
      name: months[item._id - 1] || 'Unknown',
      count: item.count
    }));

    // 6. Drop-off Rate (By Pipeline Stage)
    const dropOffRaw = await Student.aggregate([
      {
        $group: {
          _id: "$pipelineStage",
          count: { $sum: 1 }
        }
      }
    ]);
    const totalStudents = dropOffRaw.reduce((acc, curr) => acc + curr.count, 0);
    const dropOffRate = dropOffRaw.map(item => ({
      stage: item._id || 'New',
      rate: totalStudents > 0 ? Math.round((item.count / totalStudents) * 100) : 0
    })).sort((a, b) => b.rate - a.rate).slice(0, 5);

    // 7. Team Ranking
    const teamRanking = await Student.aggregate([
      { $match: { assignedCounsellor: { $ne: null } } },
      { $group: { _id: "$assignedCounsellor", score: { $sum: 1 } } },
      { $sort: { score: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ["$user.name", "Unassigned"] },
          score: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        leadsVsConversions,
        countryWiseApplications,
        latestRevenue,
        visaApprovalRate,
        activeStudents,
        dropOffRate,
        teamRanking
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export chart data as Excel
 */
exports.exportDashboardCharts = async (req, res, next) => {
  try {
    const xlsx = require('xlsx');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // 1. Leads vs Conversions
    const leadsRaw = await Lead.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          leads: { $sum: 1 },
          conversions: { $sum: { $cond: [{ $in: ["$status", ["Qualified", "Ready to Apply"]] }, 1, 0] } }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    const leadsVsConversions = leadsRaw.map(item => ({ month: months[item._id - 1] || 'Unknown', leads: item.leads, conversions: item.conversions }));

    // 2. Country-wise
    const countryRaw = await Student.aggregate([
      { $group: { _id: "$interestedCountry", value: { $sum: 1 } } },
      { $match: { _id: { $ne: null }, value: { $gt: 0 } } },
      { $sort: { value: -1 } }
    ]);
    const countryWiseApplications = countryRaw.map(item => ({ country: item._id || 'Other', count: item.value }));

    // 3. Revenue
    const revenueRaw = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: { $isoWeek: "$createdAt" }, revenue: { $sum: "$amount" } } },
      { $sort: { "_id": -1 } },
      { $limit: 12 } // Last 12 weeks for excel export
    ]);
    const latestRevenue = revenueRaw.map((item, index) => ({ week: `Week ${index + 1}`, revenue: item.revenue })).reverse();

    // 4. Visa
    const visaRaw = await VisaProcess.aggregate([
      { $match: { approvalStatus: { $in: ['Approved', 'Not approved'] } } },
      { $group: { _id: "$approvalStatus", value: { $sum: 1 } } }
    ]);
    const visaApprovalRate = visaRaw.map(item => ({ status: item._id === 'Not approved' ? 'Rejected' : item._id, count: item.value }));

    // 5. Active Students
    const activeRaw = await Student.aggregate([
      { $match: { pipelineStage: { $nin: ['Enrolled', 'Alumni Tracking'] } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { "_id": 1 } }
    ]);
    const activeStudents = activeRaw.map(item => ({ month: months[item._id - 1] || 'Unknown', count: item.count }));

    // 6. Drop-off Rate
    const dropOffRaw = await Student.aggregate([
      { $group: { _id: "$pipelineStage", count: { $sum: 1 } } }
    ]);
    const totalStudents = dropOffRaw.reduce((acc, curr) => acc + curr.count, 0);
    const dropOffRate = dropOffRaw.map(item => ({
      stage: item._id || 'New',
      count: item.count,
      ratePercentage: totalStudents > 0 ? Math.round((item.count / totalStudents) * 100) : 0
    })).sort((a, b) => b.ratePercentage - a.ratePercentage);

    // Create workbook
    const wb = xlsx.utils.book_new();
    
    // Add sheets
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(leadsVsConversions), 'Leads vs Conversions');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(countryWiseApplications), 'Country Applications');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(latestRevenue), 'Revenue Trend');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(visaApprovalRate), 'Visa Approvals');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(activeStudents), 'Active Students');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(dropOffRate), 'Drop-off Rate');

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="dashboard_charts_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};
