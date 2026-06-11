const User = require('../user/model');
const Student = require('../student/model');
const Lead = require('../lead/model');
const VisaProcess = require('../visa/model');

// --- Counsellor APIs ---

exports.getCounsellors = async (req, res, next) => {
  try {
    const counsellors = await User.find({ role: 'COUNSELLOR' })
      .select('gxId name email phone agentDetails createdAt')
      .lean();

    if (!counsellors.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: { counsellors: [], topCounsellor: null }
      });
    }

    const counsellorIds = counsellors.map(c => c._id);

    // Students handled per counsellor
    const studentsHandledAgg = await Student.aggregate([
      { $match: { assignedCounsellor: { $in: counsellorIds } } },
      { $group: { _id: '$assignedCounsellor', studentsHandled: { $sum: 1 } } }
    ]);

    // Avg processing time per counsellor using stageHistory.durationMs when present
    // (fallback: durationMs=0 for missing)
    const processingAgg = await Student.aggregate([
      { $match: { assignedCounsellor: { $in: counsellorIds } } },
      { $unwind: '$stageHistory' },
      {
        $group: {
          _id: '$assignedCounsellor',
          avgProcessingMs: { $avg: { $ifNull: ['$stageHistory.durationMs', 0] } },
        }
      }
    ]);

    // Visa success: we don't have a direct Student->VisaProcess link in schema.
    // Best-effort mapping:
    // - if VisaProcess.linkedUser equals Student._id OR Student.userId
    const visaSuccessAgg = await Promise.all([
      VisaProcess.aggregate([
        { $match: { linkedUser: { $in: counsellorIds } } },
        { $group: { _id: '$linkedUser', visaSuccessCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Approved'] }, 1, 0] } }, visaTotal: { $sum: 1 } } }
      ]),
      VisaProcess.aggregate([
        { $match: { approvalStatus: { $in: ['Approved', 'Not approved'] } } },
        { $group: { _id: '$linkedUser', visaSuccessCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Approved'] }, 1, 0] } }, visaTotal: { $sum: 1 } } }
      ])
    ]);

    const studentsHandledMap = Object.fromEntries(studentsHandledAgg.map(r => [String(r._id), r.studentsHandled]));
    const processingMap = Object.fromEntries(processingAgg.map(r => [String(r._id), r.avgProcessingMs]));

    // Build visa maps conservatively (unknown linkage). Use first agg if it matches counsellorIds, else 2nd will still be irrelevant.
    // We'll compute visaSuccessRate as visaSuccessCount/visaTotal, but if map is empty, default to 0.
    const visaMap = Object.fromEntries(
      (visaSuccessAgg[0] || []).map(r => [String(r._id), { visaSuccessCount: r.visaSuccessCount, visaTotal: r.visaTotal }])
    );

    const buildScore = (visaSuccessRate, avgProcessingMs, satisfactionScore) => {
      // Lower processing time => higher score; normalize by a soft cap.
      const cappedMs = Math.min(Math.max(avgProcessingMs, 0), 30 * 24 * 60 * 60 * 1000); // 30 days cap
      const avgProcessingScore = cappedMs === 0 ? 100 : (100 * (1 - cappedMs / (30 * 24 * 60 * 60 * 1000)));

      return (
        (visaSuccessRate * 0.4) +
        (avgProcessingScore * 0.4) +
        ((satisfactionScore ?? 0) * 0.2)
      );
    };

    // Satisfaction: no schema-backed field found in the visible models we inspected.
    // Safe fallback: return null (and score treats it as 0).
    const counsellorRows = counsellors.map(c => {
      const id = String(c._id);
      const studentsHandled = studentsHandledMap[id] || 0;

      const avgProcessingMs = processingMap[id] || 0;

      const visaStats = visaMap[id] || { visaSuccessCount: 0, visaTotal: 0 };
      const visaSuccessRate = visaStats.visaTotal > 0 ? (visaStats.visaSuccessCount / visaStats.visaTotal) * 100 : 0;

      const satisfaction = null;
      const satisfactionScore = 0;

      const performanceScore = buildScore(visaSuccessRate, avgProcessingMs, satisfactionScore);

      return {
        counsellorId: c._id,
        gxId: c.gxId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        studentsHandled,
        visaSuccess: {
          visaSuccessCount: visaStats.visaSuccessCount,
          visaTotal: visaStats.visaTotal,
          ratePercent: Number(visaSuccessRate.toFixed(2))
        },
        avgProcessing: {
          avgProcessingMs,
          avgProcessingDays: Number((avgProcessingMs / (1000 * 60 * 60 * 24)).toFixed(2))
        },
        satisfaction,
        performanceScore
      };
    });

    counsellorRows.sort((a, b) => b.performanceScore - a.performanceScore);
    const topCounsellor = counsellorRows[0] || null;

    res.status(200).json({
      success: true,
      count: counsellorRows.length,
      data: {
        counsellors: counsellorRows,
        topCounsellor
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCounsellorAnalytics = async (req, res, next) => {
  try {
    const id = req.params.id;

    const [studentsHandled, avgProcessingMs, visaStats] = await Promise.all([
      Student.countDocuments({ assignedCounsellor: id }),
      Student.aggregate([
        { $match: { assignedCounsellor: id } },
        { $unwind: '$stageHistory' },
        {
          $group: {
            _id: '$assignedCounsellor',
            avgProcessingMs: { $avg: { $ifNull: ['$stageHistory.durationMs', 0] } }
          }
        }
      ]),
      VisaProcess.aggregate([
        // Best-effort mapping: linkedUser is assumed to reference the same entity as counsellorId.
        { $match: { linkedUser: id } },
        {
          $group: {
            _id: '$linkedUser',
            visaSuccessCount: {
              $sum: { $cond: [{ $eq: ['$approvalStatus', 'Approved'] }, 1, 0] }
            },
            visaTotal: { $sum: 1 }
          }
        }
      ])
    ]);

    const avgProcessing = (avgProcessingMs?.[0]?.avgProcessingMs ?? 0);
    const visaSuccessCount = visaStats?.[0]?.visaSuccessCount ?? 0;
    const visaTotal = visaStats?.[0]?.visaTotal ?? 0;
    const visaSuccessRate = visaTotal > 0 ? (visaSuccessCount / visaTotal) * 100 : 0;

    // Satisfaction not present in visible schemas => null safe fallback
    const satisfaction = null;

    res.status(200).json({
      success: true,
      data: {
        studentsHandled,
        avgProcessing: {
          avgProcessingMs: avgProcessing,
          avgProcessingDays: Number((avgProcessing / (1000 * 60 * 60 * 24)).toFixed(2))
        },
        visaSuccess: {
          visaSuccessCount,
          visaTotal,
          ratePercent: Number(visaSuccessRate.toFixed(2))
        },
        satisfaction
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
    // Daily target
    const DAILY_TARGET_CALLS = 150;

    // Today range (server local timezone)
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const telecallers = await User.find({ role: 'TELECALLER', isActive: true }).select('gxId name email phone role agentDetails isActive isApproved isLocked mustChangePassword createdAt lastLogin').lean();

    if (!telecallers.length) {
      return res.status(200).json({
        success: true,
        data: {
          target: {
            dailyTargetCalls: DAILY_TARGET_CALLS,
            achievedCalls: 0,
            remainingCalls: DAILY_TARGET_CALLS,
            achievedPercent: 0,
          },
          telecallers: [],
          leaderboard: []
        },
      });
    }

    const telecallerIds = telecallers.map(t => t._id);

    // NOTE: We treat a "call" as a lead whose status was updated/created/interactioned for today.
    // Available data in current codebase suggests using Lead.lastInteractionDate for call timing.
    // Fallback: Lead.createdAt.
    // We count only within today.
    const leadBaseMatch = {
      handledByTelecaller: { $in: telecallerIds },
      lastInteractionDate: { $gte: startOfToday, $lte: endOfToday },
    };

    // If lastInteractionDate isn't reliable in some deployments, uncomment fallback behavior:
    // const leadBaseMatch = {
    //   handledByTelecaller: { $in: telecallerIds },
    //   $or: [
    //     { lastInteractionDate: { $gte: startOfToday, $lte: endOfToday } },
    //     { updatedAt: { $gte: startOfToday, $lte: endOfToday } },
    //     { createdAt: { $gte: startOfToday, $lte: endOfToday } },
    //   ],
    // };

    const [callsAgg, interestedAgg, notInterestedAgg, callAgainAgg] = await Promise.all([
      Lead.aggregate([
        { $match: leadBaseMatch },
        { $group: { _id: '$handledByTelecaller', totalCalls: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { ...leadBaseMatch, status: 'Interested' } },
        { $group: { _id: '$handledByTelecaller', interested: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { ...leadBaseMatch, status: 'Not interested' } },
        { $group: { _id: '$handledByTelecaller', notInterested: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { ...leadBaseMatch, status: 'Call Again' } },
        { $group: { _id: '$handledByTelecaller', callAgain: { $sum: 1 } } },
      ])
    ]);

    const callsMap = Object.fromEntries(callsAgg.map(r => [String(r._id), r.totalCalls]));
    const interestedMap = Object.fromEntries(interestedAgg.map(r => [String(r._id), r.interested]));
    const notInterestedMap = Object.fromEntries(notInterestedAgg.map(r => [String(r._id), r.notInterested]));
    const callAgainMap = Object.fromEntries(callAgainAgg.map(r => [String(r._id), r.callAgain]));

    // Build per-telecaller leaderboard items
    const leaderboard = telecallers.map(t => {
      const id = String(t._id);
      const totalCalls = callsMap[id] || 0;
      const intrested = interestedMap[id] || 0; // keeping your requested misspelling "intrested"
      const notIntrested = notInterestedMap[id] || 0; // keeping your requested label style
      const callAgain = callAgainMap[id] || 0;

      const achievedCalls = totalCalls;
      const remainingCalls = Math.max(0, DAILY_TARGET_CALLS - achievedCalls);
      const achievedPercent = DAILY_TARGET_CALLS === 0 ? 0 : (achievedCalls / DAILY_TARGET_CALLS) * 100;

      return {
        telecallerId: t._id,
        gxId: t.gxId,
        name: t.name,
        email: t.email,
        phone: t.phone,
        agentDetails: {
          agentStatus: t.agentDetails?.agentStatus || 'not_visited',
          mouStatus: t.agentDetails?.mouStatus || undefined,
          isLocked: !!t.isLocked,
        },

        stats: {
          totalCalls,
          intrested,
          notIntrested,
          callAgain,
          target: {
            dailyTargetCalls: DAILY_TARGET_CALLS,
            achievedCalls,
            remainingCalls,
            achievedPercent: Number(achievedPercent.toFixed(2)),
          }
        }
      };
    });

    leaderboard.sort((a, b) => b.stats.totalCalls - a.stats.totalCalls);

    // Overall target summary (sum across telecallers)
    const overallAchievedCalls = leaderboard.reduce((sum, x) => sum + (x.stats.totalCalls || 0), 0);
    const overallRemainingCalls = Math.max(0, DAILY_TARGET_CALLS - overallAchievedCalls);
    const overallAchievedPercent = DAILY_TARGET_CALLS === 0 ? 0 : (overallAchievedCalls / DAILY_TARGET_CALLS) * 100;

    res.status(200).json({
      success: true,
      data: {
        target: {
          dailyTargetCalls: DAILY_TARGET_CALLS,
          achievedCalls: overallAchievedCalls,
          remainingCalls: overallRemainingCalls,
          achievedPercent: Number(overallAchievedPercent.toFixed(2)),
        },
        telecallers: leaderboard,
        leaderboard
      }
    });
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
    // --- Agent base lists ---
    const agents = await User.find({ role: 'AGENT' })
      .select('gxId name isActive isApproved isLocked agentDetails.agentStatus agentDetails.businessAreaName agentDetails.businessName')
      .lean();

    const totalAgents = agents.length;

    const activeAgents = agents.filter(a => {
      const status = a.agentDetails?.agentStatus;
      return status === 'confirmed' || status === 'partnered';
    }).length;

    const agentIds = agents.map(a => a._id);

    // --- Commission payable (pending) ---
    const { CommissionLog } = require('../commission/model');

    const commissionAgg = await CommissionLog.aggregate([
      { $match: { agentId: { $in: agentIds } } },
      {
        $group: {
          _id: '$agentId',
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$amountEarned', 0] }
          }
        }
      }
    ]);

    const pendingByAgent = Object.fromEntries(commissionAgg.map(r => [String(r._id), r.pending]));
    const commissionPayable = commissionAgg.reduce((sum, r) => sum + (r.pending || 0), 0);

    // --- Business visits (derived from agentStatus not being not_visited) ---
    const visitedStatuses = [
      'visited',
      'revisit',
      'confirmed',
      'partnered',
      'permanently_closed',
    ];

    const businessVisits = agents.filter(a => {
      const s = a.agentDetails?.agentStatus;
      return s && s !== 'not_visited' && visitedStatuses.includes(s);
    }).length;

    // --- Agent business map (places covered) ---
    // We treat businessAreaName as a comma-separated list of places.
    // Output includes per-agent counts.
    const placeCounts = new Map();
    const placesByAgent = {};

    for (const a of agents) {
      const area = a.agentDetails?.businessAreaName;
      const rawPlaces = typeof area === 'string'
        ? area.split(',').map(x => x.trim()).filter(Boolean)
        : [];

      const perAgent = {};
      for (const place of rawPlaces) {
        perAgent[place] = (perAgent[place] || 0) + 1;
        placeCounts.set(place, (placeCounts.get(place) || 0) + 1);
      }

      placesByAgent[String(a._id)] = {
        agentId: a._id,
        gxId: a.gxId,
        agentName: a.name,
        businessName: a.agentDetails?.businessName || '',
        status: a.agentDetails?.agentStatus || 'not_visited',
        places: Object.entries(perAgent)
          .map(([place, count]) => ({ place, count }))
          .sort((x, y) => y.count - x.count),
      };
    }

    const placesCoveredSummary = Array.from(placeCounts.entries())
      .map(([place, count]) => ({ place, count }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      data: {
        totalAgents,
        activeAgents,
        commissionPayable,
        businessVisits,
        agentBusinessMap: placesByAgent, // Map(places covered) per agent
        placesCoveredSummary,
        // Also include a per-agent commission pending breakdown for UI convenience
        pendingCommissionByAgent: pendingByAgent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Raw agents (for listing)
exports.getAgentsSummary = async (req, res, next) => {
  try {
    const query = { role: 'AGENT' };
    if (req.query.status) {
      const statusRegex = new RegExp(`^${req.query.status}$`, 'i');
      query['$or'] = [
        { 'agentDetails.agentStatus': statusRegex },
        { status: statusRegex }
      ];
    }
    const agents = await User.find(query);
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
