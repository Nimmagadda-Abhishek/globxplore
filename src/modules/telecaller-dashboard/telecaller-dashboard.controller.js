const Lead = require('../lead/model');
const FollowUp = require('../am/followup.model');

/**
 * Telecaller dashboard summary.
 * Returns aggregated counts for:
 * - totalLeads
 * - newLeads (status = 'Lead received')
 * - contactedLeads (status = 'Contacted')
 * - pendingLeads (everything other than disqualified/terminal statuses)
 *
 * Additionally returns follow-up counts grouped by:
 *   status (pending/completed/missed/rejected) AND priority (low/medium/high)
 */
exports.getTelecallerDashboard = async (req, res, next) => {
  try {
    const telecallerId = req.user && req.user._id;

    // Lead ownership filter: existing telecaller dashboard logic uses assignedTo.
    const baseLeadFilter = telecallerId ? { assignedTo: telecallerId } : {};

    const followUpsFilter = telecallerId ? { userId: telecallerId } : {};

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      pendingLeads,
      followUpsByStatusAndPriority,
      followUpsRaw,
      totalFollowUps,
    ] = await Promise.all([
      Lead.countDocuments(baseLeadFilter),
      Lead.countDocuments({
        ...baseLeadFilter,
        status: 'Lead received',
      }),
      Lead.countDocuments({
        ...baseLeadFilter,
        status: 'Contacted',
      }),
      Lead.countDocuments({
        ...baseLeadFilter,
        // Pending = not yet converted/disqualified.
        // These statuses exist across docs; we exclude common terminal statuses.
        status: { $nin: ['Interested', 'Not interested', 'Declined', 'Call not answered'] },
      }),

      // Group follow-ups by status + priority.
      (async () => {
        // Normalize casing just in case DB values differ (e.g., "Pending" instead of "pending").
        const raw = await FollowUp.aggregate([
          { $match: followUpsFilter },
          {
            $addFields: {
              statusNorm: { $toLower: { $trim: { input: '$status' } } },
              priorityNorm: { $toLower: { $trim: { input: '$priority' } } },
            },
          },
          {
            $group: {
              _id: { status: '$statusNorm', priority: '$priorityNorm' },
              count: { $sum: 1 },
            },
          },
        ]);


        const statuses = ['pending', 'completed', 'missed', 'rejected'];
        const priorities = ['low', 'medium', 'high'];

        // Build a complete matrix so frontend can render zeros too.
        const matrix = {};
        for (const s of statuses) {
          matrix[s] = {};
          for (const p of priorities) matrix[s][p] = 0;
        }

        for (const row of raw) {
          const status = row?._id?.status;
          const priority = row?._id?.priority;
          if (status && priority && matrix[status] && matrix[status][priority] !== undefined) {
            matrix[status][priority] = row.count;
          }
        }

        return matrix;
      })(),

      // Total follow-ups (all statuses/priorities)
      FollowUp.countDocuments(followUpsFilter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        newLeads,
        leadsYouHaveContacted: contactedLeads,
        pendingLeads,

        totalFollowUps,
        followUpsByStatusAndPriority, // { pending: {low,medium,high}, completed: {...}, ... }
      },
    });
  } catch (error) {
    next(error);
  }
};


