const User = require('../user/model');
const Student = require('../student/model');
const authService = require('../auth/service');
const { generateGxId } = require('../../utils/gxIdGenerator');
const crypto = require('crypto');

/**
 * Get AM Profile
 */
exports.getProfile = async (amUserId) => {
  const profile = await User.findById(amUserId).select('-password');
  if (!profile) throw new Error('Profile not found');
  return profile;
};

/**
 * Update AM Profile
 */
exports.updateProfile = async (amUserId, data) => {
  const { phone, profileImage, address } = data;
  
  const updateData = {};
  if (phone) updateData.phone = phone;
  if (profileImage) updateData.profileImage = profileImage;
  if (address) updateData.address = address;

  const updatedProfile = await User.findByIdAndUpdate(
    amUserId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedProfile) throw new Error('Profile not found');
  
  return updatedProfile;
};
/**
 * Create a new Agent by an Agent Manager.
 */
exports.createAgent = async (amUser, agentData) => {
  const gxId = await generateGxId('AGENT');
  const temporaryPassword = crypto.randomBytes(4).toString('hex');

  const agent = await User.create({
    gxId,
    role: 'AGENT',
    name: agentData.businessOwnerName,
    email: agentData.email,
    phone: agentData.whatsapp,
    password: temporaryPassword,
    createdBy: amUser._id,
    agentDetails: {
      businessName: agentData.businessName,
      customerWhatsappNumber: agentData.whatsapp,
      secondaryNumber: agentData.secondaryNumber,
      locationUrl: agentData.locationUrl,
      businessAreaName: agentData.businessArea,
      street: agentData.street,
      lineNumber: agentData.lineNumber,
      natureOfBusiness: agentData.natureOfBusiness,
      mouStatus: agentData.mouStatus === 'completed' ? 'Completed' : 'Not Completed',
      accountDetails: JSON.stringify(agentData.accountDetails),
      agentStatus: 'not_visited',
      statusHistory: [{
        status: 'not_visited',
        updatedBy: amUser._id
      }]
    }
  });

  // Attach temp password for display in controller (not saved in plain text in DB)
  agent._tempPassword = temporaryPassword;
  
  return agent;
};

/**
 * Get agents created by a specific AM.
 */
exports.getMyAgents = async (amUserId, search) => {
  const query = { role: 'AGENT', createdBy: amUserId };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'agentDetails.businessName': { $regex: search, $options: 'i' } },
      { gxId: { $regex: search, $options: 'i' } }
    ];
  }
  
  return await User.find(query).sort({ createdAt: -1 });
};

/**
 * Search for duplicate business by name.
 */
exports.searchAgents = async (name) => {
  return await User.find({
    role: 'AGENT',
    'agentDetails.businessName': { $regex: name, $options: 'i' }
  });
};

/**
 * Update Agent Status and log history.
 */
exports.updateAgentStatus = async (amUserId, agentId, status) => {
  const agent = await User.findOne({ _id: agentId, createdBy: amUserId });
  if (!agent) throw new Error('Agent not found or access denied');

  agent.agentDetails.agentStatus = status;
  agent.agentDetails.statusHistory.push({
    status,
    updatedBy: amUserId
  });

  return await agent.save();
};

/**
 * Create a new Student by an AM.
 */
exports.createStudent = async (amUser, studentData) => {
  const gxId = await generateGxId('STUDENT');
  
  // Find the agent if assignedAgentGxId is provided
  let assignedAgentId;
  if (studentData.assignedAgentGxId) {
    const agent = await User.findOne({ gxId: studentData.assignedAgentGxId, role: 'AGENT' });
    if (agent) assignedAgentId = agent._id;
  }

  const student = await Student.create({
    gxId,
    name: studentData.fullName,
    email: studentData.email,
    phone: studentData.contact,
    country: studentData.country,
    assignedAgent: assignedAgentId,
    createdBy: amUser._id,
    pipelineStage: 'Qualified',
    stageHistory: [{ stage: 'Qualified' }]
  });

  return student;
};

/**
 * Get Dashboard Summary for AM.
 */
exports.getDashboardSummary = async (amUserId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalAgents,
    activeAgents,
    followUpsToday,
    totalStudents,
    confirmedBusinesses
  ] = await Promise.all([
    User.countDocuments({ role: 'AGENT', createdBy: amUserId }),
    User.countDocuments({ role: 'AGENT', createdBy: amUserId, isActive: true }),
    User.countDocuments({ 
      role: 'AGENT', 
      createdBy: amUserId, 
      'agentDetails.agentStatus': 'revisit', // Just an example mapping
      // In a real app, we'd check a specific followUpDate field
    }),
    Student.countDocuments({ createdBy: amUserId }),
    User.countDocuments({ role: 'AGENT', createdBy: amUserId, 'agentDetails.agentStatus': 'confirmed' })
  ]);

  return {
    totalAgents,
    activeAgents,
    followUpsToday,
    totalStudents,
    confirmedBusinesses,
    revenuePotential: totalStudents * 500 // Mock calculation: $500 per student
  };
};

/**
 * Get students created by a specific AM.
 */
exports.getMyStudents = async (amUserId) => {
  return await Student.find({ createdBy: amUserId }).populate('assignedAgent', 'name gxId');
};

/**
 * Get recent activity log for AM.
 */
exports.getMyActivities = async (amUserId) => {
  const { ActivityLog } = require('../activity/model');
  return await ActivityLog.find({ userId: amUserId })
    .sort({ timestamp: -1 })
    .limit(10);
};

/**
 * Get performance data for charts.
 */
exports.getPerformanceData = async (amUserId) => {
  // Return mock data structured for charts
  return {
    monthlyAgents: [40, 70, 45, 90, 60, 80],
    successRate: 78.4,
    conversions: 12
  };
};

/**
 * Get agents with location for map view.
 */
exports.getAgentsMapData = async (amUserId) => {
  const agents = await User.find({ 
    role: 'AGENT', 
    createdBy: amUserId,
    'agentDetails.locationUrl': { $exists: true, $ne: '' }
  }, 'gxId name agentDetails.businessName agentDetails.locationUrl agentDetails.agentStatus');
  
  return agents.map(a => ({
    gxId: a.gxId,
    businessName: a.agentDetails.businessName,
    status: a.agentDetails.agentStatus,
    locationUrl: a.agentDetails.locationUrl
  }));
};

/**
 * Create a new Follow-up.
 */
exports.createFollowUp = async (amUserId, data) => {
  const FollowUp = require('./followup.model');
  let targetId = data.targetId;

  // Resolve GX ID to ObjectId if needed
  if (typeof targetId === 'string' && targetId.startsWith('GX')) {
    if (data.targetModel === 'User') {
      const user = await User.findOne({ gxId: targetId });
      if (user) targetId = user._id;
    } else if (data.targetModel === 'Student') {
      const student = await Student.findOne({ gxId: targetId });
      if (student) targetId = student._id;
    }
  }

  return await FollowUp.create({
    userId: amUserId,
    ...data,
    targetId
  });
};

/**
 * Get follow-ups for AM.
 */
exports.getMyFollowUps = async (amUserId) => {
  const FollowUp = require('./followup.model');
  return await FollowUp.find({ userId: amUserId }).sort({ followUpDate: 1 });
};

/**
 * Update Follow-up status.
 */
exports.updateFollowUpStatus = async (amUserId, followUpId, status) => {
  const FollowUp = require('./followup.model');
  const followUp = await FollowUp.findOne({ _id: followUpId, userId: amUserId });
  if (!followUp) throw new Error('Follow-up not found or access denied');

  followUp.status = status;
  return await followUp.save();
};
