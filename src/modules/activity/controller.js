const { Session, TaskSession, ActivityLog } = require('./model');

/**
 * Handle user heartbeat and update active session.
 */
exports.heartbeat = async (req, res, next) => {
  try {
    const { _id: userId, gxId, role } = req.user;
    let session = await Session.findOne({ userId, logoutTime: { $exists: false } }).sort({ createdAt: -1 });

    if (!session) {
      // If it's a staff role, create a session on the fly to recover from missing session errors
      const staffRoles = ['ADMIN', 'AGENT_MANAGER', 'AGENT', 'TELECALLER', 'COUNSELLOR', 'VISA_AGENT', 'ALUMNI_MANAGER'];
      if (staffRoles.includes(role.toUpperCase())) {
        session = await Session.create({
          userId,
          gxId,
          loginTime: new Date(),
          status: 'active',
          activeTime: 0,
          idleTime: 0
        });
      } else {
        // For non-staff, just return success without session tracking
        return res.status(200).json({ success: true, message: 'Heartbeat acknowledged' });
      }
    }

    const now = new Date();
    const lastHeartbeat = session.lastHeartbeat || session.loginTime;
    const diffInMinutes = (now - lastHeartbeat) / (1000 * 60);

    // If diff is more than 5 minutes, consider idle time
    if (diffInMinutes > 5) {
      session.idleTime += diffInMinutes;
    } else {
      session.activeTime += diffInMinutes;
    }

    session.lastHeartbeat = now;
    session.status = diffInMinutes > 5 ? 'idle' : 'active';
    await session.save();

    res.status(200).json({ success: true, message: 'Heartbeat recorded' });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a task session.
 */
exports.startTask = async (req, res, next) => {
  try {
    const { taskName } = req.body;
    const { _id: userId, gxId } = req.user;

    const taskSession = await TaskSession.create({
      userId,
      gxId,
      taskName,
      startTime: new Date(),
    });

    res.status(201).json({ success: true, data: taskSession });
  } catch (error) {
    next(error);
  }
};

/**
 * End a task session and calculate duration.
 */
exports.endTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { productivityScore } = req.body;

    const taskSession = await TaskSession.findById(taskId);
    if (!taskSession) {
      return res.status(404).json({ success: false, message: 'Task session not found' });
    }

    taskSession.endTime = new Date();
    taskSession.duration = (taskSession.endTime - taskSession.startTime) / (1000 * 60);
    taskSession.productivityScore = productivityScore;
    await taskSession.save();

    res.status(200).json({ success: true, data: taskSession });
  } catch (error) {
    next(error);
  }
};

/**
 * Log a manual activity.
 */
exports.logActivity = async (req, res, next) => {
  try {
    const { action, module, metadata } = req.body;
    const { _id: userId, gxId } = req.user;

    const log = await ActivityLog.create({
      userId,
      gxId,
      action,
      module,
      metadata,
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};
