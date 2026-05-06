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

    res.status(200).json({ success: true, data: aggregation });
  } catch (error) {
    next(error);
  }
};
