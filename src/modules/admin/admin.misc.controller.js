const { ActivityLog } = require('../activity/model');
const CompanyDocument = require('../document/companyDocument.model');

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
