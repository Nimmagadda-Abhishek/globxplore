const { Session, TaskSession } = require('../activity/model');
const User = require('../user/model');
const Attendance = require('../activity/attendance.model');


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

    const now = Date.now();
    const activeWindowMinutes = 5;

    // NOTE: Based on current Session schema:
    // - activeNow: lastHeartbeat within last 5 minutes
    // - attendancePercent: (activeTime / (activeTime + idleTime)) * 100 for that day
    //   (since we don't have a separate leave model, we interpret % attendance as active vs (active+idle) within tracked session time)
    const sessionsWithDerived = sessions.map(s => {
      const lastHeartbeatMs = s.lastHeartbeat ? new Date(s.lastHeartbeat).getTime() : new Date(s.loginTime).getTime();
      const isActiveNow = (now - lastHeartbeatMs) / (1000 * 60) <= activeWindowMinutes;

      const avgWorkingHours = (() => {
        const activeMinutes = typeof s.activeTime === 'number' ? s.activeTime : 0;
        const workingMinutes = Math.max(0, activeMinutes);
        return workingMinutes / 60;
      })();

      const attendancePercent = (() => {
        const activeMinutes = typeof s.activeTime === 'number' ? s.activeTime : 0;
        const idleMinutes = typeof s.idleTime === 'number' ? s.idleTime : 0;
        const totalTrackedMinutes = Math.max(0, activeMinutes + idleMinutes);
        if (totalTrackedMinutes === 0) return 0;
        return (activeMinutes / totalTrackedMinutes) * 100;
      })();

      return {
        ...s.toObject(),
        activeNow: isActiveNow,
        avgWorkingHours,
        attendancePercent,
      };
    });

    const membersCount = sessions.length;
    const activeMembersNow = sessionsWithDerived.filter(s => s.activeNow).length;

    // Fetch all employees to calculate OVERALL metrics
    const EMPLOYEE_ROLES = ['TELECALLER', 'COUNSELLOR', 'AGENT_MANAGER', 'ALUMNI_MANAGER', 'VISA_AGENT'];
    const userQuery = { role: { $in: EMPLOYEE_ROLES }, isActive: true };
    if (role) {
      userQuery.role = role.toUpperCase();
    }
    const allEmployees = await User.find(userQuery).select('_id');
    const totalEmployees = allEmployees.length;

    // Filter valid employee sessions to prevent ADMINs from affecting the metrics
    const employeeRolesUpper = EMPLOYEE_ROLES.map(r => r.toUpperCase());
    const validSessions = sessionsWithDerived.filter(s => {
      const r = s.userId && s.userId.role ? s.userId.role.toUpperCase() : '';
      return employeeRolesUpper.includes(r);
    });

    // Calculate present and on-leave
    const uniquePresentUserIds = new Set(
      validSessions.map(s => String(s.userId._id || s.userId.id || s.userId))
    );
    const presentCount = uniquePresentUserIds.size;
    const onLeaveCount = Math.max(0, totalEmployees - presentCount);

    // Calculate active now
    const uniqueActiveNowIds = new Set(
      validSessions
        .filter(s => s.activeNow || s.status === 'active')
        .map(s => String(s.userId._id || s.userId.id || s.userId))
    );
    const activeNowCount = uniqueActiveNowIds.size;

    const sumWorkingHours = validSessions.reduce((acc, s) => acc + (typeof s.avgWorkingHours === 'number' ? s.avgWorkingHours : 0), 0);
    const avgWorkingHoursAll = totalEmployees > 0 ? (sumWorkingHours / totalEmployees) : 0;

    const attendancePercentAll = totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0;

    res.status(200).json({
      success: true,
      data: sessionsWithDerived,
      summary: {
        totalEmployees,
        membersCount: presentCount,
        activeNowMembers: activeNowCount,
        avgWorkingHoursAll,
        attendancePercentAll,
        onLeaveMembers: onLeaveCount
      },
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
          tasksCompleted: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $sort: { avgProductivity: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    next(error);
  }
};

const normalizeDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const getDayRange = (dayDate) => {
  const start = normalizeDay(dayDate);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const EMPLOYEE_ROLES = ['TELECALLER', 'COUNSELLOR', 'AGENT_MANAGER', 'AGENT', 'ALUMNI_MANAGER', 'VISA_AGENT'];

/**
 * Calculate and store daily attendance for all employees in a custom period.
 * If attendance is missing for a user on a day => mark as leave.
 */
exports.calculateAttendanceForRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body || {};

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (YYYY-MM-DD recommended)',
      });
    }

    const start = normalizeDay(startDate);
    const end = normalizeDay(endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be <= endDate',
      });
    }

    // Build list of days
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // employees: based on roles confirmed by user
    const employees = await User.find({
      role: { $in: EMPLOYEE_ROLES },
      isActive: true,
    }).select('_id gxId role name');

    const calculatedBy = req.user && req.user._id;

    let upserted = 0;

    // For each employee + day, determine present/leave.
    // Attendance source: Session loginTime/activeTime/idleTime for that day.
    for (const employee of employees) {
      for (const day of days) {
        const { start: dayStart, end: dayEnd } = getDayRange(day);

        const sessions = await Session.find({
          userId: employee._id,
          loginTime: { $gte: dayStart, $lte: dayEnd },
        }).sort({ loginTime: 1 });

        let doc;
        if (sessions && sessions.length > 0 && sessions.some((s) => (s.activeTime || s.idleTime || s.status))) {
          const activeMinutes = sessions.reduce((acc, s) => acc + (typeof s.activeTime === 'number' ? s.activeTime : 0), 0);
          const idleMinutes = sessions.reduce((acc, s) => acc + (typeof s.idleTime === 'number' ? s.idleTime : 0), 0);
          const total = Math.max(0, activeMinutes + idleMinutes);
          const attendancePercent = total === 0 ? 0 : (activeMinutes / total) * 100;

          doc = {
            userId: employee._id,
            gxId: employee.gxId,
            date: day,
            status: 'present',
            // Treat multiple logins as a single day entry
            loginTime: sessions[0].loginTime,
            logoutTime: sessions[sessions.length - 1].logoutTime || null,
            activeTimeMinutes: activeMinutes,
            idleTimeMinutes: idleMinutes,
            attendancePercent,
            calculatedBy,
            calculatedAt: new Date(),
          };
        } else {
          doc = {
            userId: employee._id,
            gxId: employee.gxId,
            date: day,
            status: 'leave',
            activeTimeMinutes: 0,
            idleTimeMinutes: 0,
            attendancePercent: 0,
            calculatedBy,
            calculatedAt: new Date(),
          };
        }

        await Attendance.updateOne(
          { userId: employee._id, date: day },
          { $set: doc },
          { upsert: true }
        );
        upserted += 1;
      }
    }

    // Return stored records for the calculated window with pagination.
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 20)));

    const windowStart = start;
    const windowEnd = new Date(end);
    windowEnd.setHours(23, 59, 59, 999);

    const totalCount = await Attendance.countDocuments({
      date: { $gte: windowStart, $lte: windowEnd },
    });

    const records = await Attendance.find({
      date: { $gte: windowStart, $lte: windowEnd },
    })
      .populate('userId', 'name role gxId')
      .sort({ date: 1, 'userId.name': 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    res.status(200).json({
      success: true,
      message: 'Attendance calculation completed',
      data: {
        employeesCount: employees.length,
        daysCount: days.length,
        recordsUpserted: upserted,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        records,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export stored attendance for a custom date range as CSV.
 */
exports.exportAttendanceForRangeCsv = async (req, res, next) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required as query params',
      });
    }

    const start = normalizeDay(startDate);
    const end = normalizeDay(endDate);
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be <= endDate',
      });
    }

    const startDay = start;
    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: startDay, $lte: endDay },
    })
      .populate('userId', 'name role gxId')
      .sort({ date: 1, 'userId.name': 1 });

    const headers = [
      'date',
      'gxId',
      'employeeName',
      'role',
      'status',
      'loginTime',
      'logoutTime',
      'activeTimeMinutes',
      'idleTimeMinutes',
      'attendancePercent',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const lines = [headers.join(',')];

    for (const r of records) {
      const employee = r.userId;
      lines.push(
        [
          r.date.toISOString().slice(0, 10),
          r.gxId,
          employee?.name || '',
          employee?.role || '',
          r.status,
          r.loginTime ? new Date(r.loginTime).toISOString() : '',
          r.logoutTime ? new Date(r.logoutTime).toISOString() : '',
          r.activeTimeMinutes,
          r.idleTimeMinutes,
          r.attendancePercent !== undefined ? Number(r.attendancePercent.toFixed(2)) : '',
        ].map(escapeCsv).join(',')
      );
    }

    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${start.toISOString().slice(0, 10)}_to_${end.toISOString().slice(0, 10)}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

