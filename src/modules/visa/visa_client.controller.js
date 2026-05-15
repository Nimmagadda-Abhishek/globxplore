const authService = require('../auth/service');
const VisaProcess = require('./model');
const User = require('../user/model');

/**
 * Visa Client Login
 * @route POST /api/client/login
 */

/**
 * Get Client Profile
 * @route GET /api/client/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const process = await VisaProcess.findOne({ linkedUser: req.user.id });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: { user, process } });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Pipeline
 * @route GET /api/client/pipeline
 */
exports.getPipeline = async (req, res, next) => {
  try {
    const process = await VisaProcess.findOne({ linkedUser: req.user.id });
    if (!process) return res.status(404).json({ success: false, message: 'Visa Process not found' });
    
    // Read-only tracker info
    const pipeline = {
      ds160Status: process.ds160Status,
      paymentStatus: process.visaFeePaymentStatus,
      appointmentStatus: process.appointmentStatus,
      slotBookingStatus: process.slotBookingStatus,
      biometricStatus: process.biometricStatus,
      interviewStatus: process.interviewStatus,
      approvalStatus: process.approvalStatus,
      notes: process.notes
    };

    res.status(200).json({ success: true, data: pipeline });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Documents
 * @route POST /api/client/documents
 */
exports.uploadDocuments = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    
    // Can just save general docs or update specific list
    const fileUrl = req.file.path || req.file.location;
    const doc = { name: req.body.name || 'General Document', url: fileUrl };

    const process = await VisaProcess.findOneAndUpdate(
      { linkedUser: req.user.id }, 
      { $push: { mandatoryDocs: doc } },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Document uploaded', data: process });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Checklist
 * @route GET /api/client/checklist
 */
exports.getChecklist = async (req, res, next) => {
  try {
    const process = await VisaProcess.findOne({ linkedUser: req.user.id });
    if (!process) return res.status(404).json({ success: false, message: 'Visa Process not found' });

    const requiredDocs = [
      'Passport Front & Back',
      'Aadhar Card',
      'DS-160 Confirmation Page',
      'Visa Appointment Confirmation',
      'I-20 (if F1)',
      'SEVIS Fee Receipt',
      'Financial Documents',
      'Academic Transcripts',
      'Standardized Test Scores',
      'Work Experience Letters (if any)'
    ];

    res.status(200).json({ 
      success: true, 
      data: {
        required: requiredDocs,
        uploaded: process.mandatoryDocs
      } 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Checklist Document
 * @route POST /api/client/checklist/:id/upload
 */
exports.uploadChecklistDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    
    const fileUrl = req.file.path || req.file.location;
    const itemName = req.params.id; // e.g., index or slug
    const docName = req.body.name || `Checklist Item ${itemName}`;

    const process = await VisaProcess.findOneAndUpdate(
      { linkedUser: req.user.id },
      { $push: { mandatoryDocs: { name: docName, url: fileUrl } } },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Checklist document uploaded', data: process });
  } catch (error) {
    next(error);
  }
};
