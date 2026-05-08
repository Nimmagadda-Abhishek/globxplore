const { CommissionRate, CommissionLog } = require('./model');
const mongoose = require('mongoose');

/**
 * Add or Update a Commission Rate mapping (Admins only)
 */
exports.setCommissionRate = async (req, res, next) => {
  try {
    const { country, percentage, flatFee } = req.body;
    
    // Upsert the commission rate
    const rate = await CommissionRate.findOneAndUpdate(
      { country },
      { percentage, flatFee },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: rate });
  } catch (error) {
    next(error);
  }
};

/**
 * Get country-wise commission totals for the currently logged-in Agent
 */
exports.getMyCommissions = async (req, res, next) => {
  try {
    const agentId = req.user._id;
    const Student = require('../student/model');
    const CommissionService = require('./service');

    // 1. Get aggregation of earnings by country
    const aggregation = await CommissionLog.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId) } },
      { 
        $group: { 
          _id: "$country", 
          totalEarned: { $sum: "$amountEarned" },
          logsCount: { $sum: 1 }
        } 
      }
    ]);

    // 2. Get current tier and enrollment count
    const enrollmentCount = await Student.countDocuments({
      $or: [{ assignedAgent: agentId }, { sourceAgent: agentId }, { createdBy: agentId }],
      pipelineStage: 'Enrolled'
    });
    const tier = CommissionService.getAgentTier(enrollmentCount);

    res.status(200).json({ 
      success: true, 
      data: {
        summary: aggregation,
        stats: {
          enrollmentCount,
          tierName: tier.name,
          tierLabel: tier.label
        }
      } 
    });
  } catch (error) {
    next(error);
  }
};
