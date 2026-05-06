const Student = require('../student/model');
const Payment = require('../payment/model');
const { Session } = require('../activity/model');
const mongoose = require('mongoose');

/**
 * Get conversion rates (Total leads raised -> Converted to Student).
 */
exports.getConversionStats = async (req, res, next) => {
  try {
    const Lead = require('../lead/model');
    
    // In our new architecture, a 'Student' profile is precisely a converted Lead.
    const totalLeadsRaised = await Lead.countDocuments();
    const convertedStudents = await Student.countDocuments();

    const conversionRate = totalLeadsRaised > 0 ? (convertedStudents / totalLeadsRaised) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLeadsRaised,
        convertedStudents,
        conversionRate: conversionRate.toFixed(2) + '%',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue tracking statistics.
 */
exports.getRevenueStats = async (req, res, next) => {
  try {
    const payments = await Payment.find({ status: 'Paid' });
    const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        transactionCount: payments.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get employee performance (Active time, attendance, and breakdown).
 * Supports query params: startDate, endDate
 */
exports.getPerformanceStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const User = require('../user/model');

    // 1. Build Filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // 2. Aggregate Sessions by User
    const userStats = await Session.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$userId",
          totalActiveMinutes: { $sum: { $ifNull: ["$activeTime", 0] } },
          totalIdleMinutes: { $sum: { $ifNull: ["$idleTime", 0] } },
          sessionCount: { $sum: 1 },
          lastHeartbeat: { $max: "$lastHeartbeat" },
          lastLogin: { $max: "$loginTime" },
          status: { $last: "$status" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$userDetails.name", "Unknown"] },
          gxId: { $ifNull: ["$userDetails.gxId", "N/A"] },
          role: { $ifNull: ["$userDetails.role", "N/A"] },
          totalActiveMinutes: 1,
          totalIdleMinutes: 1,
          sessionCount: 1,
          lastHeartbeat: 1,
          lastLogin: 1,
          status: 1
        }
      },
      { $sort: { totalActiveMinutes: -1 } }
    ]);

    // 3. Calculate Overall Totals
    const overall = userStats.reduce((acc, curr) => {
      acc.totalSessions += curr.sessionCount;
      acc.totalActiveMinutes += curr.totalActiveMinutes;
      acc.totalIdleMinutes += curr.totalIdleMinutes;
      return acc;
    }, {
      totalSessions: 0,
      totalActiveMinutes: 0,
      totalIdleMinutes: 0,
      userCount: userStats.length
    });

    res.status(200).json({
      success: true,
      data: {
        overall,
        individualBreakdown: userStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get telecaller performance evaluation.
 * Filters via req.query (startDate, endDate, telecallerId)
 */
exports.getTelecallerPerformance = async (req, res, next) => {
  try {
    const Lead = require('../lead/model');
    const mongoose = require('mongoose');
    
    const { startDate, endDate, telecallerId } = req.query;
    let matchStage = { handledByTelecaller: { $exists: true } };

    if (telecallerId) {
      matchStage.handledByTelecaller = new mongoose.Types.ObjectId(telecallerId);
    }

    if (startDate || endDate) {
      matchStage.lastInteractionDate = {};
      if (startDate) matchStage.lastInteractionDate.$gte = new Date(startDate);
      if (endDate) matchStage.lastInteractionDate.$lte = new Date(endDate);
    }

    const performanceQuery = await Lead.aggregate([
      { $match: matchStage },
      { 
        $group: { 
          _id: {
            telecaller: "$handledByTelecaller",
            status: "$status"
          },
          count: { $sum: 1 }
        } 
      },
      {
        $group: {
          _id: "$_id.telecaller",
          statuses: {
            $push: {
              status: "$_id.status",
              count: "$count"
            }
          },
          totalHandled: { $sum: "$count" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'telecallerDetails'
        }
      },
      { $unwind: "$telecallerDetails" },
      {
        $project: {
          _id: 1,
          name: "$telecallerDetails.name",
          gxId: "$telecallerDetails.gxId",
          totalHandled: 1,
          statuses: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: performanceQuery });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top-level admin dashboard overview.
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const Lead = require('../lead/model');
    const User = require('../user/model');
    const Student = require('../student/model');
    const mongoose = require('mongoose');

    // Dates
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    // Promises run in parallel
    const [
      totalLeads,
      newLeadsToday,
      convertedStudents,
      activeAgents,
      leadPipelineData,
      followUpReminders,
      recentLeads,
      agentPerformanceData
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: todayStart } }),
      Student.countDocuments(),
      User.countDocuments({ role: 'AGENT', isActive: true }),
      
      // Overview of leads by stage
      Lead.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // Upcoming tasks - Follow up reminders (Scheduled for today or later)
      Lead.find({ 
        followUpDate: { $gte: todayStart },
        status: { $nin: ['Interested', 'Not interested'] }
      }).sort({ followUpDate: 1 }).limit(10).populate('assignedTo', 'name'),

      // Latest incoming leads
      Lead.find().sort({ createdAt: -1 }).limit(10).populate('sourceAgent', 'name'),

      // Leads and conversions by agent this month
      Lead.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { 
          $group: {
            _id: "$sourceAgent",
            totalLeads: { $sum: 1 },
            conversions: { 
              $sum: { $cond: [{ $eq: ["$status", "Interested"] }, 1, 0] } 
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agentDetails'
          }
        },
        { $unwind: { path: "$agentDetails", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            agentName: { $ifNull: ["$agentDetails.name", "Unknown/Unassigned"] },
            totalLeads: 1,
            conversions: 1
          }
        }
      ])
    ]);

    // Format pipeline safely
    const leadPipeline = {};
    leadPipelineData.forEach(item => {
      leadPipeline[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totals: {
          totalLeads,
          newLeadsToday,
          convertedStudents,
          activeAgents,
        },
        leadPipeline,
        followUpReminders,
        recentLeads,
        agentPerformance: agentPerformanceData
      }
    });

  } catch (error) {
    next(error);
  }
};
