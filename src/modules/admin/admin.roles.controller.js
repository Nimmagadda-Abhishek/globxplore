const User = require('../user/model');
const Student = require('../student/model');
const Lead = require('../lead/model');

// --- Counsellor APIs ---

exports.getCounsellors = async (req, res, next) => {
  try {
    const counsellors = await User.find({ role: 'COUNSELLOR' });
    res.status(200).json({ success: true, data: counsellors });
  } catch (error) {
    next(error);
  }
};

exports.getCounsellorAnalytics = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [studentsHandled, offersReceived] = await Promise.all([
      Student.countDocuments({ assignedCounsellor: id }),
      Student.countDocuments({ assignedCounsellor: id, pipelineStage: 'Offer Received' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        studentsHandled,
        offersReceived,
        visaSuccessRate: 0, // Logic to be refined
        avgResponseTime: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.reassignCounsellorStudents = async (req, res, next) => {
  try {
    const { newCounsellorId } = req.body;
    await Student.updateMany({ assignedCounsellor: req.params.id }, { assignedCounsellor: newCounsellorId });
    res.status(200).json({ success: true, message: 'Students reassigned successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Telecaller APIs ---

exports.getTelecallers = async (req, res, next) => {
  try {
    const telecallers = await User.find({ role: 'TELECALLER' });
    res.status(200).json({ success: true, data: telecallers });
  } catch (error) {
    next(error);
  }
};

exports.getTelecallerAnalytics = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [callsMade, interestedLeads] = await Promise.all([
      Lead.countDocuments({ handledByTelecaller: id }),
      Lead.countDocuments({ handledByTelecaller: id, status: 'Interested' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        callsMade,
        interestedLeads,
        followUpsDone: 0,
        conversionContribution: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.reassignTelecallerLeads = async (req, res, next) => {
  try {
    const { newTelecallerId } = req.body;
    await Lead.updateMany({ assignedTo: req.params.id }, { assignedTo: newTelecallerId });
    res.status(200).json({ success: true, message: 'Leads reassigned successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Agent APIs ---

exports.getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'AGENT' });
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    next(error);
  }
};

exports.getAgentById = async (req, res, next) => {
  try {
    const agent = await User.findById(req.params.id);
    const [students, commissionData] = await Promise.all([
      Student.find({ assignedAgent: req.params.id }),
      // Placeholder for commissions
      []
    ]);

    res.status(200).json({
      success: true,
      data: {
        agent,
        students,
        commissions: commissionData
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAgentManagers = async (req, res, next) => {
  try {
    const managers = await User.find({ role: 'AGENT_MANAGER' });
    res.status(200).json({ success: true, data: managers });
  } catch (error) {
    next(error);
  }
};

exports.getAgentsMap = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'AGENT' }).select('name agentDetails.locationUrl agentDetails.businessName');
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    next(error);
  }
};

exports.updateAgentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Agent not found' });
    
    user.agentDetails.agentStatus = status;
    await user.save();

    res.status(200).json({ success: true, message: 'Agent status updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};
