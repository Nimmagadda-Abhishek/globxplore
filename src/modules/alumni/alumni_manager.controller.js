const authService = require('../auth/service');
const User = require('../user/model');
const Payment = require('../payment/model');
const {
  AlumniRegistration,
  StudentRequest,
  ServiceRequest,
  PricingCatalog,
  CommunityPost
} = require('./model');
const { AlumniService } = require('./alumni.model');
const alumniService = require('./alumni.service');
const paymentService = require('../payment/service');
const notificationService = require('../notification/service');

// --- 1. Authentication APIs ---

exports.login = async (req, res, next) => {
  try {
    const { gxId, password } = req.body;
    if (!gxId || !password) return res.status(400).json({ success: false, message: 'GX ID and password required' });

    const loginData = await authService.loginUser(gxId, password);
    if (loginData.user.role !== 'ALUMNI_MANAGER' && loginData.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: not an Alumni Manager' });
    }

    res.status(200).json({ success: true, data: loginData });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};


// --- 2. Dashboard APIs ---

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const pendingRegistrations = await AlumniRegistration.countDocuments({ status: 'Pending' });
    const pendingStudentRequests = await StudentRequest.countDocuments({ status: 'Pending' });
    const pendingServiceRequests = await ServiceRequest.countDocuments({ status: 'Pending' });
    const activeAlumni = await User.countDocuments({ role: 'ALUMNI', isActive: true });

    res.status(200).json({
      success: true,
      data: {
        pendingRegistrations,
        pendingStudentRequests,
        pendingServiceRequests,
        activeAlumni
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardActivity = async (req, res, next) => {
  try {
    // Mocking an activity feed combining various models
    const activities = [
      { type: 'Registration', message: 'New alumni registration received', date: new Date() }
    ];
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};


// --- 3. Alumni Registration APIs ---

exports.getRegistrations = async (req, res, next) => {
  try {
    const registrations = await AlumniRegistration.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: registrations });
  } catch (error) {
    next(error);
  }
};

exports.getRegistrationById = async (req, res, next) => {
  try {
    const registration = await AlumniRegistration.findById(req.params.id);
    if (!registration) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: registration });
  } catch (error) {
    next(error);
  }
};

exports.approveRegistration = async (req, res, next) => {
  try {
    const registration = await AlumniRegistration.findById(req.params.id);
    if (!registration) return res.status(404).json({ success: false, message: 'Not found' });

    if (registration.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Already approved' });
    }

    // Auto Actions: Create login account, Generate GX ID
    const newAlumniUser = await authService.registerUser({
      role: 'ALUMNI',
      name: registration.name,
      email: registration.email,
      phone: registration.phone
    });

    registration.status = 'Approved';
    registration.linkedUser = newAlumniUser._id;
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Registration approved and user created',
      data: {
        gxId: newAlumniUser.gxId,
        password: newAlumniUser._autoPassword,
        registration
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectRegistration = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const registration = await AlumniRegistration.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', rejectionReason: reason },
      { new: true }
    );
    res.status(200).json({ success: true, data: registration });
  } catch (error) {
    next(error);
  }
};


// --- 4. Users APIs ---

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'ALUMNI' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status, isApproved } = req.body;
    const update = {};
    if (status) update.isActive = status === 'active';
    if (typeof isApproved !== 'undefined') update.isApproved = isApproved;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'ALUMNI' },
      { $set: update },
      { new: true }
    );
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all alumni pending approval
 */
exports.getPendingAlumni = async (req, res, next) => {
  try {
    const alumni = await User.find({ role: 'ALUMNI', isApproved: false }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alumni });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve an alumni account
 */
exports.approveAlumniAccount = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'ALUMNI' },
      { isApproved: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Alumni not found' });
    res.status(200).json({ success: true, message: 'Alumni approved successfully', data: user });
  } catch (error) {
    next(error);
  }
};


// --- 5. Student Connect APIs ---

exports.getStudentRequests = async (req, res, next) => {
  try {
    const requests = await StudentRequest.find().populate('student', 'name email').populate('alumni', 'name email');
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.assignMentor = async (req, res, next) => {
  try {
    const { alumniId } = req.body;
    const request = await StudentRequest.findByIdAndUpdate(
      req.params.id,
      { alumni: alumniId, status: 'Assigned' },
      { new: true }
    );
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

exports.resolveRequest = async (req, res, next) => {
  try {
    const request = await StudentRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Resolved' },
      { new: true }
    );
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};


// --- 6. Alumni Service Approval APIs ---

exports.getAllAlumniServices = async (req, res, next) => {
  try {
    const services = await AlumniService.find().populate('alumniId', 'name email gxId');
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

exports.getPendingAlumniServices = async (req, res, next) => {
  try {
    const services = await alumniService.getPendingServices();
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

exports.approveAlumniService = async (req, res, next) => {
  try {
    const service = await alumniService.updateServiceReviewStatus(req.params.id, 'Accepted');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.status(200).json({ success: true, message: 'Service approved successfully', data: service });
  } catch (error) {
    next(error);
  }
};

exports.rejectAlumniService = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    
    const service = await alumniService.updateServiceReviewStatus(req.params.id, 'Rejected', reason);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.status(200).json({ success: true, message: 'Service rejected', data: service });
  } catch (error) {
    next(error);
  }
};


// --- 7. Service Request APIs ---

exports.getServiceRequests = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find().populate('user', 'name email gxId');
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.approveService = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved' },
      { new: true }
    );
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

exports.rejectService = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected' },
      { new: true }
    );
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

exports.modifyCost = async (req, res, next) => {
  try {
    const { cost } = req.body;
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { cost },
      { new: true }
    );
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};


// --- 8. Pricing APIs ---

exports.getPricing = async (req, res, next) => {
  try {
    const catalog = await PricingCatalog.find();
    res.status(200).json({ success: true, data: catalog });
  } catch (error) {
    next(error);
  }
};

exports.updatePricing = async (req, res, next) => {
  try {
    const { serviceName, defaultCost } = req.body;
    const item = await PricingCatalog.findOneAndUpdate(
      { serviceName },
      { defaultCost },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};


// --- 9. Payment APIs ---

exports.getPayments = async (req, res, next) => {
  try {
    // Assuming 'type' or description indicates Alumni Service
    const payments = await Payment.find();
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentSummary = async (req, res, next) => {
  try {
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    res.status(200).json({ success: true, data: { revenue: totalRevenue[0]?.total || 0 } });
  } catch (error) {
    next(error);
  }
};


// --- 10. Community APIs ---

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { content } = req.body;
    const post = await CommunityPost.create({
      author: req.user.id,
      content,
      type: 'Announcement'
    });
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

exports.getCommunityFeed = async (req, res, next) => {
  try {
    const posts = await CommunityPost.find().populate('author', 'name gxId').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};


// --- 11. Reports APIs ---

exports.exportReports = async (req, res, next) => {
  try {
    const { type, format } = req.query;
    // Returning JSON for now. A real export would generate an Excel buffer and set headers.
    res.status(200).json({ success: true, message: `Report data for ${type} in ${format} format`, data: [] });
  } catch (error) {
    next(error);
  }
};

exports.getPayoutRequests = async (req, res, next) => {
  try {
    const payouts = await ServiceRequest.find({ paymentStatus: 'Paid' })
      .populate('user', 'name gxId')
      .populate('alumniId', 'name gxId alumniDetails')
      .sort({ isCompleted: -1, isFundTransferred: 1, createdAt: -1 });
      
    res.status(200).json({ success: true, data: payouts });
  } catch (error) { next(error); }
};

exports.transferFunds = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).populate('alumniId');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!request.isCompleted) return res.status(400).json({ success: false, message: 'Service must be marked completed by student before fund transfer' });
    if (request.isFundTransferred) return res.status(400).json({ success: false, message: 'Funds already transferred for this request' });

    const alumni = request.alumniId;
    if (!alumni || !alumni.alumniDetails || !alumni.alumniDetails.payoutBankDetails) {
      return res.status(400).json({ 
        success: false, 
        message: 'Alumni bank details not found. Alumni must update their bank details in their portal first.' 
      });
    }

    // Attempt Razorpay Payout
    try {
      const payout = await paymentService.createPayout(
        alumni._id, 
        request.cost, 
        alumni.alumniDetails.payoutBankDetails,
        `Payout for ${request.serviceName}`
      );

      request.isFundTransferred = true;
      request.payoutId = payout.id;
      request.payoutResponse = payout;
      await request.save();

      // Notify Alumni
      try {
        await notificationService.triggerNotification({
          userId: alumni._id,
          eventKey: 'FUNDS_TRANSFERRED',
          data: {
            amount: request.cost,
            serviceName: request.serviceName,
            actionUrl: `/alumni/payments`
          }
        });
      } catch (notifError) {
        console.error('Failed to notify alumni about fund transfer:', notifError);
      }

      res.status(200).json({ 
        success: true, 
        message: 'Funds transferred successfully via Razorpay', 
        payoutId: payout.id,
        mock: payout.mock || false
      });
    } catch (payoutError) {
      console.error('Payout failed:', payoutError);
      return res.status(500).json({ 
        success: false, 
        message: `Razorpay Payout failed: ${payoutError.message}` 
      });
    }
  } catch (error) {
    next(error);
  }
};
