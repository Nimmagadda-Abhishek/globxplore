const Lead = require('../lead/model');
const User = require('../user/model');

/**
 * List all leads with filters.
 */
exports.getLeads = async (req, res, next) => {
  try {
    const { source, stage, page = 1, limit = 20 } = req.query;
    const query = {};

    if (source) query.source = source;
    if (stage) query.status = stage;

    const leads = await Lead.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'name gxId')
      .populate('sourceAgent', 'name gxId')
      .sort({ createdAt: -1 });

    const count = await Lead.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        leads,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalLeads: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lead details.
 */
exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name gxId')
      .populate('sourceAgent', 'name gxId')
      .populate('handledByTelecaller', 'name gxId');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign lead to staff.
 */
exports.assignLead = async (req, res, next) => {
  try {
    const { assignedTo } = req.body; // Expecting GX ID or Object ID
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    let user;
    if (assignedTo.startsWith('GX')) {
      user = await User.findOne({ gxId: assignedTo });
    } else {
      user = await User.findById(assignedTo);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    lead.assignedTo = user._id;
    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Lead assigned successfully',
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk upload leads (Placeholder logic).
 */
exports.bulkUploadLeads = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }
    // Logic to parse CSV/Excel and create leads...
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully. Processing in background.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lead Analytics.
 */
exports.getLeadAnalytics = async (req, res, next) => {
  try {
    const funnel = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const sourcePerformance = await Lead.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        funnel,
        sourcePerformance
      }
    });
  } catch (error) {
    next(error);
  }
};
