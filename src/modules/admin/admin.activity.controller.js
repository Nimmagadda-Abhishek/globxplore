const { Session, TaskSession } = require('../activity/model');
const User = require('../user/model');

/**
 * Get attendance records.
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const { date, role } = req.query;
    const query = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.loginTime = { $gte: start, $lte: end };
    }

    let sessions = await Session.find(query).populate('userId', 'name role gxId');

    if (role) {
      sessions = sessions.filter(s => s.userId && s.userId.role.toUpperCase() === role.toUpperCase());
    }

    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Detailed attendance for a specific user.
 */
exports.getUserAttendance = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.params.userId }).sort({ loginTime: -1 });
    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Team performance metrics.
 */
exports.getPerformance = async (req, res, next) => {
  try {
    const performance = await TaskSession.aggregate([
      {
        $group: {
          _id: '$userId',
          avgProductivity: { $avg: '$productivityScore' },
          totalDuration: { $sum: '$duration' },
          tasksCompleted: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $sort: { avgProductivity: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    next(error);
  }
};
