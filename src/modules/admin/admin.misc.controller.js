const { ActivityLog } = require('../activity/model');

// --- Partner Offer APIs ---
exports.getOffers = async (req, res, next) => {
  // Logic to fetch from Offer model (assuming it exists in src/modules/offer)
  res.status(200).json({ success: true, data: [] });
};

// --- Document Center APIs ---
exports.uploadDocument = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Document uploaded' });
};

// --- Reports APIs ---
exports.getWeeklyReport = async (req, res, next) => {
  res.status(200).json({ success: true, data: { report: 'Weekly Report Data' } });
};

// --- Notifications APIs ---
exports.broadcastNotification = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Broadcast sent' });
};

// --- Settings APIs ---
exports.getSettings = async (req, res, next) => {
  res.status(200).json({ success: true, data: { workingHours: '9-6', commission: 10 } });
};

// --- Audit Logs APIs ---
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(100);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
