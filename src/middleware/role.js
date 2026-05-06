/**
 * Restrict access to specific roles.
 * @param {...string} roles - The allowed roles.
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user ? req.user.role : 'Guest'} is not authorized to access this route`,
      });
    }
    next();
  };
};

/**
 * Ensure Agent is confirmed before allowing them to perform actions.
 */
exports.requireConfirmedAgent = (req, res, next) => {
  if (req.user && req.user.role === 'AGENT') {
    if (req.user.agentDetails && req.user.agentDetails.agentStatus !== 'confirmed') {
      return res.status(403).json({
        success: false,
        message: 'Your Agent account is not confirmed yet. You cannot perform this action.'
      });
    }
  }
  next();
};
