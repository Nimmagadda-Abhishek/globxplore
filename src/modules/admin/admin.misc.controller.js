const { ActivityLog } = require('../activity/model');
const CompanyDocument = require('../document/companyDocument.model');

// --- Alerts APIs ---
exports.getAlerts = async (req, res, next) => {
  try {
    const Notification = require('../notification/model');
    const { DateTime } = require('luxon');

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const alerts = notifications.map(notif => {
      // Map priority to title case
      const priorityStr = notif.priority || 'medium';
      const priority = priorityStr.charAt(0).toUpperCase() + priorityStr.slice(1);

      // Map types roughly to frontend types if needed, else capitalize
      let type = 'System';
      if (notif.type === 'reminder') type = 'Follow-up';
      else if (notif.type === 'chat') type = 'Call';
      else if (notif.type === 'payment') type = 'Task';
      else if (notif.type === 'status') type = 'System';
      else if (notif.type === 'escalation') type = 'Deadline';

      return {
        id: notif._id,
        title: notif.title,
        type: type,
        priority: priority,
        desc: notif.message,
        time: DateTime.fromJSDate(notif.createdAt).toRelative() || 'Just now',
      };
    });

    res.status(200).json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
};

// --- Partner Offer APIs ---
exports.getOffers = async (req, res, next) => {
  // Logic to fetch from Offer model (assuming it exists in src/modules/offer)
  res.status(200).json({ success: true, data: [] });
};

// --- Document Center APIs ---
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { name, description, type } = req.body;

    const document = await CompanyDocument.create({
      name: name || req.file.originalname,
      description,
      type,
      url: req.file.path || req.file.location,
      uploadedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Document uploaded successfully', data: document });
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const documents = await CompanyDocument.find().populate('uploadedBy', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: documents.length, data: documents });
  } catch (error) {
    next(error);
  }
};

exports.getDocumentById = async (req, res, next) => {
  try {
    const document = await CompanyDocument.findById(req.params.id).populate('uploadedBy', 'name email');
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await CompanyDocument.findByIdAndDelete(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
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
