const User = require('../user/model');
const authService = require('../auth/service');

/**
 * Create a new Visa Agent.
 * @route POST /api/admin/visa-agents
 */
exports.createVisaAgent = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, and phone are required' });
    }

    const user = await authService.registerUser({
      role: 'VISA_AGENT',
      name,
      email,
      phone
    });

    res.status(201).json({
      success: true,
      message: 'Visa Agent created successfully',
      data: {
        gxId: user.gxId,
        password: user._autoPassword // Temporary password for admin to share
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all Visa Agents.
 * @route GET /api/admin/visa-agents
 */
exports.getVisaAgents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = { role: 'VISA_AGENT' };

    if (status) query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gxId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalUsers: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Visa Agent status (Activate / Deactivate).
 * @route PATCH /api/admin/visa-agents/:id/status
 */
exports.updateVisaAgentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const isActive = status === 'active';
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'VISA_AGENT' },
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Visa Agent not found' });
    }

    res.status(200).json({
      success: true,
      message: `Visa Agent ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
