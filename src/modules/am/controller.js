const amService = require('./service');
const authService = require('../auth/service');

/**
 * Change AM Password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both old and new passwords' });
    }

    const data = await authService.changeUserPassword(req.user._id, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: data.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get AM Profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const profile = await amService.getProfile(req.user._id);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * Update AM Profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await amService.updateProfile(req.user._id, req.body);
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: profile });
  } catch (error) {
    next(error);
  }
};
/**
 * Create a new Agent.
 */
exports.createAgent = async (req, res, next) => {
  try {
    const agent = await amService.createAgent(req.user, req.body);
    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: {
        gxId: agent.gxId,
        password: agent._tempPassword,
        businessName: agent.agentDetails.businessName
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all agents created by the logged-in AM.
 */
exports.getAgents = async (req, res, next) => {
  try {
    const { search } = req.query;
    const agents = await amService.getMyAgents(req.user._id, search);

    const Lead = require('../lead/model');
    const Student = require('../student/model');

    const agentIds = agents.map(a => a._id);

    const totalLeads = await Lead.countDocuments({ sourceAgent: { $in: agentIds } });
    const totalConversions = await Student.countDocuments({ sourceAgent: { $in: agentIds } });
    
    const activeAgents = agents.filter(a => a.agentDetails && a.agentDetails.agentStatus === 'confirmed').length;
    const avgConversionRate = totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0;

    res.status(200).json({ 
      success: true, 
      data: { 
        agents,
        totalAgents: agents.length,
        activeAgents,
        totalConversions,
        avgConversionRate
      } 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single agent details.
 */
exports.getAgentById = async (req, res, next) => {
  try {
    const agent = await amService.getMyAgents(req.user._id);
    const found = agent.find(a => a._id.toString() === req.params.id);
    if (!found) return res.status(404).json({ success: false, message: 'Agent not found' });
    res.status(200).json({ success: true, data: found });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for duplicate agents.
 */
exports.searchAgents = async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'Search name is required' });
    
    const results = await amService.searchAgents(name);
    res.status(200).json({
      success: true,
      exists: results.length > 0,
      data: results.map(r => ({
        gxId: r.gxId,
        businessName: r.agentDetails.businessName,
        location: r.agentDetails.street
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Agent status.
 */
exports.updateAgentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const agent = await amService.updateAgentStatus(req.user._id, req.params.id, status);
    res.status(200).json({ success: true, message: 'Status updated', data: agent });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Student.
 */
exports.createStudent = async (req, res, next) => {
  try {
    const student = await amService.createStudent(req.user, req.body);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Dashboard Summary.
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await amService.getDashboardSummary(req.user._id);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all students created by the logged-in AM.
 */
exports.getStudents = async (req, res, next) => {
  try {
    const students = await amService.getMyStudents(req.user._id);
    res.status(200).json({ success: true, data: { students } }); // Wrapping in object as expected by frontend
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activity log.
 */
exports.getActivities = async (req, res, next) => {
  try {
    const activities = await amService.getMyActivities(req.user._id);
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

/**
 * Get performance analytics.
 */
exports.getPerformance = async (req, res, next) => {
  try {
    const data = await amService.getPerformanceData(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get map data for agents.
 */
exports.getMapData = async (req, res, next) => {
  try {
    const data = await amService.getAgentsMapData(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get in-app notifications.
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const Notification = require('../notification/model');
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a follow-up reminder.
 */
exports.createFollowUp = async (req, res, next) => {
  try {
    const followUp = await amService.createFollowUp(req.user._id, req.body);
    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all follow-ups for the AM.
 */
exports.getFollowUps = async (req, res, next) => {
  try {
    const followUps = await amService.getMyFollowUps(req.user._id);
    res.status(200).json({ success: true, data: followUps });
  } catch (error) {
    next(error);
  }
};

/**
 * Update follow-up status.
 */
exports.updateFollowUpStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const followUp = await amService.updateFollowUpStatus(req.user._id, req.params.id, status);
    res.status(200).json({ success: true, message: 'Status updated', data: followUp });
  } catch (error) {
    next(error);
  }
};
