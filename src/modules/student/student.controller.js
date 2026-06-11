const studentService = require('./student.service');
const authService = require('../auth/service');

/**
 * Public: Student self-registration
 */
exports.register = async (req, res, next) => {
  try {
    const registration = await studentService.requestRegistration(req.body);
    res.status(201).json({ success: true, message: 'Registration request submitted. Admin will review.', data: registration });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Login
 */

/**
 * Student: Get profile (me)
 */
exports.getMe = async (req, res, next) => {
  try {
    const student = await require('./model').findOne({ userId: req.user._id }).populate('assignedCounsellor', 'name email');
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Dashboard summary
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await studentService.getStudentDashboard(req.user._id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Get personal pipeline/timeline
 */
exports.getPipeline = async (req, res, next) => {
  try {
    const pipeline = await studentService.getStudentPipeline(req.user._id);
    res.status(200).json({ success: true, data: pipeline });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Alerts
 */
exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = await studentService.getStudentAlerts(req.user._id);
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Profile update
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const student = await studentService.updateStudentProfile(req.user._id, req.body);
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Document upload
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    const { category } = req.body;
    const url = req.file ? req.file.location : req.body.url;
    
    if (!url) {
      return res.status(400).json({ success: false, message: 'File or URL is required' });
    }

    const doc = await studentService.addDocument(req.user._id, {
      name: req.file ? req.file.originalname : (req.body.name || category),
      url,
      type: req.file ? req.file.mimetype : 'unknown',
      category: category || 'other',
      uploadedAt: new Date()
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: List documents
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const student = await require('./model').findOne({ userId: req.user._id });
    if (!student) throw new Error('Student profile not found');

    const requiredCategories = [
      'passport', 'photo', 'marksheet_10th', 'marksheet_12th', 
      'bachelors_transcripts', 'bachelors_degree', 'ielts_toefl_pte', 'sop'
    ];
    // Note: Other documents like 'national_id' or 'masters_transcripts' are optional and not in the 'required' list by default, 
    // but can still be uploaded via 'Other' or if specifically requested.

    const uploadedCategories = student.documents.map(d => d.category);
    const missingDocuments = requiredCategories.filter(c => !uploadedCategories.includes(c));

    res.status(200).json({ 
      success: true, 
      data: {
        uploaded: student.documents,
        missing: missingDocuments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Subscription plans
 */
exports.getPlans = async (req, res, next) => {
  try {
    const SubscriptionPlan = require('../subscription/model');
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Create order
 */
exports.createOrder = async (req, res, next) => {
  try {
    const order = await studentService.createSubscriptionOrder(req.user._id, req.body.planId);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Verify payment
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const result = await studentService.verifyPayment(req.user._id, req.body);
    res.status(200).json({ success: true, message: 'Payment verified successfully', data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Get list of payments/fees
 */
exports.getPayments = async (req, res, next) => {
  try {
    const student = await require('./model').findOne({ userId: req.user._id });
    res.status(200).json({ success: true, data: student.payments || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Create Razorpay order for a specific fee
 */
exports.initiateFeePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const order = await studentService.createFeeOrder(req.user._id, paymentId);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Action: Get pending registrations
 */
exports.getPendingRegistrations = async (req, res, next) => {
  try {
    const registrations = await studentService.getPendingRegistrations();
    res.status(200).json({ success: true, data: registrations });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Action: Approve registration
 */
exports.approveStudent = async (req, res, next) => {
  try {
    const result = await studentService.approveRegistration(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Student approved and account created', data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Action: Reject registration
 */
exports.rejectStudent = async (req, res, next) => {
  try {
    const registration = await studentService.rejectRegistration(req.params.id, req.body.reason);
    res.status(200).json({ success: true, message: 'Registration rejected', data: registration });
  } catch (error) {
    next(error);
  }
};

// --- Jobs Section ---

exports.getOpenJobs = async (req, res, next) => {
  try {
    const { AlumniJob } = require('../alumni/alumni.model');
    const jobs = await AlumniJob.find({ status: 'Open' })
      .populate('alumniId', 'name email alumniDetails.currentWorkingRole alumniDetails.university')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: jobs });
  } catch (error) { next(error); }
};

exports.applyForJob = async (req, res, next) => {
  try {
    const { AlumniJob, JobApplication } = require('../alumni/alumni.model');
    const jobId = req.params.id;
    const { resumeUrl, coverLetter } = req.body;

    const job = await AlumniJob.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.status !== 'Open') return res.status(400).json({ success: false, message: 'Job is no longer open' });

    // Check if already applied
    const existing = await JobApplication.findOne({ jobId, studentId: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'You have already applied for this job' });

    const application = await JobApplication.create({
      jobId,
      studentId: req.user._id,
      alumniId: job.alumniId,
      resumeUrl,
      coverLetter
    });

    // Increment applicants counter
    job.performance.applicants = (job.performance.applicants || 0) + 1;
    await job.save();

    res.status(201).json({ success: true, message: 'Application submitted successfully', data: application });
  } catch (error) { next(error); }
};

exports.getMyApplications = async (req, res, next) => {
  try {
    const { JobApplication } = require('../alumni/alumni.model');
    const applications = await JobApplication.find({ studentId: req.user._id })
      .populate('jobId', 'title location salaryRange status')
      .populate('alumniId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: applications });
  } catch (error) { next(error); }
};

exports.getApplicationChat = async (req, res, next) => {
  try {
    const { AlumniChatMessage, JobApplication } = require('../alumni/model');
    const applicationId = req.params.id;
    const userId = req.user._id || req.user.id;

    const application = await JobApplication.findById(applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    // Verify ownership
    if (application.studentId.toString() !== userId.toString() && application.alumniId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const messages = await AlumniChatMessage.find({ applicationId })
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) { next(error); }
};

exports.sendApplicationChatMessage = async (req, res, next) => {
  try {
    const { AlumniChatMessage, JobApplication } = require('../alumni/model');
    const applicationId = req.params.id;
    const userId = req.user._id || req.user.id;
    const { message } = req.body;

    const application = await JobApplication.findById(applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    // Verify ownership
    if (application.studentId.toString() !== userId.toString() && application.alumniId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const receiverId = application.studentId.toString() === userId.toString() ? application.alumniId : application.studentId;

    const chatMsg = await AlumniChatMessage.create({
      sender: userId,
      receiver: receiverId,
      applicationId,
      message
    });

    res.status(201).json({ success: true, data: chatMsg });
  } catch (error) { next(error); }
};
