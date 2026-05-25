const jwt = require('jsonwebtoken');
const User = require('../modules/user/model');
const { Session } = require('../modules/activity/model');

const STAFF_SESSION_ROLES = ['AGENT_MANAGER', 'AGENT', 'TELECALLER', 'COUNSELLOR', 'VISA_AGENT', 'ALUMNI_MANAGER'];
const SESSION_IDLE_TIMEOUT_MINUTES = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES) || 30;

/**
 * Protect routes - ensures the user is authenticated.
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    if (req.user.isLocked) {
      return res.status(403).json({ success: false, message: 'Your account has been locked. Please contact support.' });
    }

    if (STAFF_SESSION_ROLES.includes(req.user.role.toUpperCase())) {
      const session = await Session.findOne({ userId: req.user._id, logoutTime: { $exists: false } }).sort({ createdAt: -1 });

      if (!session) {
        return res.status(401).json({ success: false, message: 'Session expired or logged out. Please login again.' });
      }

      const now = new Date();
      const lastActive = session.lastHeartbeat || session.loginTime || now;
      const diffInMinutes = (now - lastActive) / (1000 * 60);

      if (diffInMinutes > SESSION_IDLE_TIMEOUT_MINUTES) {
        session.logoutTime = now;
        session.status = 'logged_out';
        await session.save();
        return res.status(401).json({ success: false, message: 'Session expired due to inactivity. Please login again.' });
      }

      // Keep the session alive on any authenticated request outside explicit heartbeat polling
      const isHeartbeatRoute = req.baseUrl === '/api/activity' && req.path === '/heartbeat';
      if (!isHeartbeatRoute) {
        session.lastHeartbeat = now;
        session.status = 'active';
        await session.save();
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
