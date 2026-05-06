const User = require('./model');
const { registerUser } = require('../auth/service');

const crypto = require('crypto');

/**
 * Get Profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { phone, profileImage, address } = req.body;
    
    const updateData = {};
    if (phone) updateData.phone = phone;
    if (profileImage) updateData.profileImage = profileImage;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Create an agent under an Agent Manager.
 */
exports.createAgent = async (req, res, next) => {
  try {
    const { 
      name, email, phone, password,
      businessName, customerWhatsappNumber, secondaryNumber, 
      locationUrl, accountDetails, mouStatus, 
      businessAreaName, street, lineNumber, natureOfBusiness 
    } = req.body;
    
    // Ensure the current user is an Agent Manager or Admin
    if (req.user.role !== 'AGENT_MANAGER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Validate required Agent Business fields
    if (!businessName || !customerWhatsappNumber || !locationUrl || !businessAreaName || !street || !natureOfBusiness) {
      return res.status(400).json({ success: false, message: 'Missing required business details fields' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Business Board Photo is required' });
    }

    const agentDetails = {
      businessName,
      customerWhatsappNumber,
      secondaryNumber,
      locationUrl,
      businessBoardPhoto: req.file.location, // S3 URL returned by multer-s3
      accountDetails,
      mouStatus: mouStatus || 'Not Completed',
      businessAreaName,
      street,
      lineNumber,
      natureOfBusiness
    };

    const agent = await registerUser({
      name,
      email,
      phone,
      password,
      role: 'AGENT',
      agentDetails,
      createdBy: (req.user.role === 'ADMIN' && req.body.assignedManagerId) ? req.body.assignedManagerId : req.user._id 
    });

    res.status(201).json({
      success: true,
      message: `Agent created successfully.${agent._autoPassword ? ` Password: ${agent._autoPassword}` : ''}`,
      data: {
        agent,
        mustChangePassword: agent.mustChangePassword,
        autoPassword: agent._autoPassword
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all subordinates (e.g., AM getting their AGs).
 */
exports.getSubordinates = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'AGENT_MANAGER') {
      query.role = 'AGENT';
      query.createdBy = req.user._id; // Only fetch agents added by this manager
    } else if (req.user.role === 'ADMIN') {
      query.role = { $ne: 'ADMIN' };
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const users = await User.find(query);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * Create an Agent Manager. Only accessible by ADMIN.
 */
exports.createAgentManager = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    
    // Ensure the current user is an Admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized, only ADMIN can create Agent Managers' });
    }

    const agentManager = await registerUser({
      name,
      email,
      phone,
      role: 'AGENT_MANAGER',
    });

    res.status(201).json({
      success: true,
      message: `Agent Manager created successfully. Password: ${agentManager._autoPassword}`,
      data: {
        agentManager,
        mustChangePassword: agentManager.mustChangePassword,
        autoPassword: agentManager._autoPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Agent Managers. Accessible by ADMIN.
 */
exports.getAgentManagers = async (req, res, next) => {
  try {
    const managers = await User.find({ role: 'AGENT_MANAGER' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: managers.length, data: managers });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single Agent Manager by ID. Accessible by ADMIN.
 */
exports.getAgentManagerById = async (req, res, next) => {
  try {
    const manager = await User.findOne({ _id: req.params.id, role: 'AGENT_MANAGER' });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Agent Manager not found' });
    }
    res.status(200).json({ success: true, data: manager });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all normal Agents globally. Accessible by ADMIN.
 */
exports.getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'AGENT' })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: agents.length, data: agents });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single Agent by ID. Accessible by ADMIN.
 */
exports.getAgentById = async (req, res, next) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'AGENT' })
      .populate('createdBy', 'name');
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    res.status(200).json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Telecallers. Accessible by ADMIN.
 */
exports.getTelecallers = async (req, res, next) => {
  try {
    const telecallers = await User.find({ role: 'TELECALLER' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: telecallers.length, data: telecallers });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a Telecaller. Only accessible by ADMIN.
 */
exports.createTelecaller = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    
    // Ensure the current user is an Admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized, only ADMIN can create Telecallers' });
    }

    const telecaller = await registerUser({
      name,
      email,
      phone,
      role: 'TELECALLER',
    });

    res.status(201).json({
      success: true,
      message: `Telecaller created successfully. Password: ${telecaller._autoPassword}`,
      data: {
        telecaller,
        mustChangePassword: telecaller.mustChangePassword,
        autoPassword: telecaller._autoPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user. Only accessible by ADMIN.
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ensure the current user is an Admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized, only ADMIN can delete users' });
    }

    // Safety check: Admin cannot delete their own account
    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'Admins cannot delete their own profile' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Agent Status. Only accessible by ADMIN.
 */
exports.updateAgentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agentStatus } = req.body;

    // Ensure the current user is an Admin or Agent Manager
    if (req.user.role !== 'ADMIN' && req.user.role !== 'AGENT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Unauthorized, only ADMIN or AGENT_MANAGER can update agent status' });
    }

    const agent = await User.findById(id);
    if (!agent || agent.role !== 'AGENT') {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    if (['Not visited', 'Closed', 'Revisit', 'confirmed'].includes(agentStatus)) {
      agent.agentDetails.agentStatus = agentStatus;
      await agent.save();
      res.status(200).json({ success: true, message: `Agent status updated to ${agentStatus}`, data: agent });
    } else {
      res.status(400).json({ success: false, message: 'Invalid status' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update Agent Profile (e.g. Account Details & MOU file). 
 * Accessible by the AGENT themselves.
 */
exports.updateAgentProfile = async (req, res, next) => {
  try {
    const { accountDetails } = req.body;
    
    // Ensure the current user is an Agent
    if (req.user.role !== 'AGENT') {
      return res.status(403).json({ success: false, message: 'Not authorized for this action' });
    }

    const agent = await User.findById(req.user._id);

    if (accountDetails) {
      agent.agentDetails.accountDetails = accountDetails;
    }

    // Check if multer parsed a document file
    if (req.file) {
      agent.agentDetails.mouFile = req.file.location;
    }

    await agent.save();

    res.status(200).json({ success: true, message: 'Agent profile updated successfully', data: agent.agentDetails });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin creates Visa Agent.
 */
exports.createVisaAgent = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const visaAgent = await registerUser({
      name,
      email,
      phone,
      role: 'VISA_AGENT',
    });

    res.status(201).json({
      success: true,
      message: `Visa Agent created successfully. Password: ${visaAgent._autoPassword}`,
      data: {
        visaAgent,
        mustChangePassword: visaAgent.mustChangePassword,
        autoPassword: visaAgent._autoPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Visa Agents. Accessible by ADMIN.
 */
exports.getVisaAgents = async (req, res, next) => {
  try {
    const visaAgents = await User.find({ role: 'VISA_AGENT' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: visaAgents.length, data: visaAgents });
  } catch (error) {
    next(error);
  }
};

/**
 * Visa Agent creates Visa Client.
 */
exports.createVisaClient = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const visaClient = await registerUser({
      name,
      email,
      phone,
      role: 'VISA_CLIENT',
    });
    
    // Assign CreatedBy 
    visaClient.createdBy = req.user._id;
    await visaClient.save();

    res.status(201).json({
      success: true,
      message: `Visa Client created successfully. Password: ${visaClient._autoPassword}`,
      data: {
        visaClient,
        mustChangePassword: visaClient.mustChangePassword,
        autoPassword: visaClient._autoPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};
