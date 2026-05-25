const User = require('../user/model');
const Student = require('../student/model');
const { CommissionLog } = require('../commission/model');
const CommissionService = require('../commission/service');

/**
 * GET /api/admin/agents/performance
 * Returns each agent's performance:
 *  - profile info (name, gxId, businessName, status)
 *  - studentsAdded  → students where createdBy = agent._id
 *  - studentsEnrolled → enrolled students linked to the agent
 *  - totalEarnings  → sum of CommissionLog.amountEarned for the agent
 *  - pendingEarnings → unpaid commission total
 *  - paidEarnings   → paid commission total
 *  - tier           → Starter / Growth / Pro / Elite
 */
exports.getAgentPerformance = async (req, res, next) => {
  try {
    // 1. Fetch all agents
    const agents = await User.find({ role: 'AGENT' })
      .select('gxId name email phone agentDetails createdAt')
      .lean();

    if (!agents.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const agentIds = agents.map(a => a._id);

    // 2. Students ADDED by each agent (createdBy)
    const studentsAddedAgg = await Student.aggregate([
      { $match: { createdBy: { $in: agentIds } } },
      { $group: { _id: '$createdBy', count: { $sum: 1 } } }
    ]);

    // 3. Students ENROLLED linked to each agent
    const enrolledAgg = await Student.aggregate([
      {
        $match: {
          pipelineStage: 'Enrolled',
          $or: [
            { assignedAgent: { $in: agentIds } },
            { sourceAgent:   { $in: agentIds } },
            { createdBy:     { $in: agentIds } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $in: ['$assignedAgent', agentIds] },
              '$assignedAgent',
              {
                $cond: [
                  { $in: ['$sourceAgent', agentIds] },
                  '$sourceAgent',
                  '$createdBy'
                ]
              }
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 4. Commission earnings per agent
    const earningsAgg = await CommissionLog.aggregate([
      { $match: { agentId: { $in: agentIds } } },
      {
        $group: {
          _id: '$agentId',
          totalEarnings:   { $sum: '$amountEarned' },
          pendingEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$amountEarned', 0] }
          },
          paidEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$amountEarned', 0] }
          }
        }
      }
    ]);

    // 5. Build lookup maps
    const addedMap   = Object.fromEntries(studentsAddedAgg.map(r => [r._id.toString(), r.count]));
    const enrolledMap = Object.fromEntries(enrolledAgg.map(r => [r._id.toString(), r.count]));
    const earningsMap = Object.fromEntries(earningsAgg.map(r => [r._id.toString(), r]));

    // 6. Assemble result
    const data = agents.map(agent => {
      const id = agent._id.toString();
      const enrolledCount = enrolledMap[id] || 0;
      const tier = CommissionService.getAgentTier(enrolledCount);
      const earnings = earningsMap[id] || { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0 };

      return {
        agentId:          agent._id,
        gxId:             agent.gxId,
        name:             agent.name,
        email:            agent.email,
        phone:            agent.phone,
        businessName:     agent.agentDetails?.businessName || '',
        agentStatus:      agent.agentDetails?.agentStatus  || 'not_visited',
        joinedAt:         agent.createdAt,
        studentsAdded:    addedMap[id]   || 0,
        studentsEnrolled: enrolledCount,
        tier:             tier.name,
        tierLabel:        tier.label,
        totalEarnings:    earnings.totalEarnings,
        pendingEarnings:  earnings.pendingEarnings,
        paidEarnings:     earnings.paidEarnings
      };
    });

    // Sort by studentsAdded descending (best performers first)
    data.sort((a, b) => b.studentsAdded - a.studentsAdded);

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};
