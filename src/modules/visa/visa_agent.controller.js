const authService = require('../auth/service');
const VisaProcess = require('./model');
const User = require('../user/model');
const paymentService = require('../payment/service');

/**
 * Visa Agent Login
 * @route POST /api/visa-agent/login
 */
exports.login = async (req, res, next) => {
  try {
    const { gxId, password } = req.body;
    if (!gxId || !password) {
      return res.status(400).json({ success: false, message: 'GX ID and password are required' });
    }

    const loginData = await authService.loginUser(gxId, password);
    if (loginData.user.role !== 'VISA_AGENT' && loginData.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: not a Visa Agent' });
    }

    res.status(200).json({ success: true, data: loginData });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout Visa Agent
 * @route POST /api/visa-agent/logout
 */
exports.logout = (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current Visa Agent Profile
 * @route GET /api/visa-agent/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Dashboard Summary
 * @route GET /api/visa-agent/dashboard/summary
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const agentId = req.user.role === 'ADMIN' ? undefined : req.user.id;
    const query = agentId ? { assignedAgent: agentId } : {};

    const totalClients = await VisaProcess.countDocuments(query);
    const pendingDS160 = await VisaProcess.countDocuments({ ...query, ds160Status: 'Pending' });
    const pendingPayments = await VisaProcess.countDocuments({ ...query, visaFeePaymentStatus: 'Pending' });
    const monitoringCases = await VisaProcess.countDocuments({ ...query, appointmentStatus: 'Monitoring' });
    const upcomingBiometrics = await VisaProcess.countDocuments({ ...query, biometricStatus: 'Pending' }); // Ideally with date filter
    const upcomingInterviews = await VisaProcess.countDocuments({ ...query, interviewStatus: 'Pending' }); // Ideally with date filter
    const approved = await VisaProcess.countDocuments({ ...query, approvalStatus: 'Approved' });
    const rejected = await VisaProcess.countDocuments({ ...query, approvalStatus: 'Not approved' });

    res.status(200).json({
      success: true,
      data: {
        totalClients,
        pendingDS160,
        pendingPayments,
        monitoringCases,
        upcomingBiometrics,
        upcomingInterviews,
        approved,
        rejected
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dashboard Urgent Actions
 * @route GET /api/visa-agent/dashboard/urgent
 */
exports.getDashboardUrgent = async (req, res, next) => {
  try {
    const agentId = req.user.role === 'ADMIN' ? undefined : req.user.id;
    const query = agentId ? { assignedAgent: agentId } : {};

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // 1. Pending items > 24h
    const urgentDS160 = await VisaProcess.find({ 
      ...query, 
      ds160Status: 'Pending', 
      createdAt: { $lt: twentyFourHoursAgo } 
    }).populate('linkedUser', 'name');

    // 2. Delayed Payments > 48h
    const delayedPayments = await VisaProcess.find({
      ...query,
      visaFeePaymentStatus: 'Pending',
      createdAt: { $lt: fortyEightHoursAgo }
    }).populate('linkedUser', 'name');

    // 3. Upcoming Dates (next 48h)
    const upcomingDates = await VisaProcess.find({
      ...query,
      $or: [
        { biometricDate: { $gte: new Date(), $lte: new Date(Date.now() + 48 * 60 * 60 * 1000) } },
        { interviewDate: { $gte: new Date(), $lte: new Date(Date.now() + 48 * 60 * 60 * 1000) } }
      ]
    }).populate('linkedUser', 'name');

    res.status(200).json({
      success: true,
      data: {
        urgentDS160,
        delayedPayments,
        upcomingDates
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Client
 * @route POST /api/visa-agent/clients
 */
exports.createClient = async (req, res, next) => {
  try {
    const { fullName, contact, email, passport, aadhar, country, visaType, assignedAgentId, cutOffDates, locationPriority } = req.body;

    const user = await authService.registerUser({
      role: 'VISA_CLIENT',
      name: fullName,
      email,
      phone: contact
    });

    const visaProcess = await VisaProcess.create({
      linkedUser: user._id,
      clientId: user.gxId,
      visaType,
      country,
      assignedAgent: assignedAgentId || req.user.id,
      assignedAgentName: req.user.name,
      passport,
      aadhar,
      cutOffDates,
      locationPriority,
      stage: 'client_created'
    });

    // Notify the client with credentials (via Notification Service)
    const { triggerNotification } = require('../notification/service');
    triggerNotification({
      userId: user._id,
      eventKey: 'VISA_CLIENT_CREDENTIALS',
      data: {
        name: fullName,
        gxId: user.gxId,
        password: user._autoPassword
      },
      channels: ['app', 'email', 'whatsapp']
    }).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Visa Client created successfully and credentials sent.',
      data: {
        gxId: user.gxId,
        password: user._autoPassword,
        processId: visaProcess._id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Clients
 * @route GET /api/visa-agent/clients
 */
exports.getClients = async (req, res, next) => {
  try {
    const { country, visaType, page = 1, limit = 20 } = req.query;
    const query = {};
    if (country) query.country = country;
    if (visaType) query.visaType = visaType;
    if (req.user.role === 'VISA_AGENT') query.assignedAgent = req.user.id;

    const clients = await VisaProcess.find(query)
      .populate('linkedUser', 'name email phone gxId')
      .skip((page - 1) * limit)
      .limit(limit * 1);

    const count = await VisaProcess.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        clients,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalClients: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Client By ID
 * @route GET /api/visa-agent/clients/:id
 */
exports.getClientById = async (req, res, next) => {
  try {
    const client = await VisaProcess.findById(req.params.id).populate('linkedUser');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Client
 * @route PUT /api/visa-agent/clients/:id
 */
exports.updateClient = async (req, res, next) => {
  try {
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Create DS-160 Credentials
 * @route POST /api/visa-agent/clients/:id/ds160/create
 */
exports.createDS160 = async (req, res, next) => {
  try {
    const { username, password, confirmationNumber } = req.body;
    const client = await VisaProcess.findByIdAndUpdate(
      req.params.id, 
      { 
        ds160Credentials: { username, password, confirmationNumber },
        stage: 'ds160_pending'
      }, 
      { new: true }
    );
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Update DS-160 Status
 * @route PATCH /api/visa-agent/clients/:id/ds160/status
 */
exports.updateDS160Status = async (req, res, next) => {
  try {
    const { status } = req.body; // pending, submitted
    const ds160Status = status === 'submitted' ? 'Submitted' : 'Pending';
    const stage = status === 'submitted' ? 'ds160_submitted' : 'ds160_pending';
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, { ds160Status, stage }, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload DS-160 PDF
 * @route POST /api/visa-agent/clients/:id/ds160/pdf
 */
exports.uploadDS160Pdf = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileUrl = req.file.path || req.file.location;
    res.status(200).json({ success: true, message: 'DS160 PDF uploaded', fileUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * Get DS-160
 * @route GET /api/visa-agent/clients/:id/ds160
 */
exports.getDS160 = async (req, res, next) => {
  try {
    const client = await VisaProcess.findById(req.params.id).select('+ds160Credentials.password');
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Portal Credentials
 * @route POST /api/visa-agent/clients/:id/portal/create
 */
exports.createPortal = async (req, res, next) => {
  try {
    const { portalName, portalUrl, username, password } = req.body;
    const client = await VisaProcess.findByIdAndUpdate(
      req.params.id, 
      { 
        portalCredentials: { portalName, portalUrl, username, password } 
      }, 
      { new: true }
    );
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Portal Credentials
 * @route GET /api/visa-agent/clients/:id/portal
 */
exports.getPortal = async (req, res, next) => {
  try {
    const client = await VisaProcess.findById(req.params.id).select('+portalCredentials.password');
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Razorpay Order
 * @route POST /api/visa-agent/clients/:id/payment/order
 */
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, type } = req.body;
    const client = await VisaProcess.findById(req.params.id).populate('linkedUser');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const orderData = await paymentService.createOrder(
      client.linkedUser._id,
      client.clientId,
      amount,
      type
    );
    res.status(201).json({ success: true, data: orderData });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Razorpay Payment Link
 * @route POST /api/visa-agent/clients/:id/payment/link
 */
exports.generatePaymentLink = async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    const client = await VisaProcess.findById(req.params.id).populate('linkedUser');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const linkData = await paymentService.createPaymentLink(
      client.linkedUser._id,
      client.clientId,
      amount,
      description || 'Visa Portal/Service Fee'
    );

    // Store in VisaProcess for easy access/status tracking
    await VisaProcess.findByIdAndUpdate(req.params.id, {
      $push: {
        paymentLinks: {
          plId: linkData.id,
          shortUrl: linkData.short_url,
          amount: amount,
          status: linkData.status,
          description: description || 'Visa Portal/Service Fee'
        }
      }
    });

    res.status(201).json({ success: true, data: linkData });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync Payment Link Status
 * @route GET /api/visa-agent/clients/:id/payment/link/:plId/sync
 */
exports.syncPaymentLinkStatus = async (req, res, next) => {
  try {
    const { id, plId } = req.params;
    const client = await VisaProcess.findById(id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // Fetch from Razorpay
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    let rzpLink;
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_key_id') {
      // Mock update for dev
      rzpLink = { status: 'paid' }; 
    } else {
      rzpLink = await razorpay.paymentLink.fetch(plId);
    }

    // Update in CRM
    const updatedClient = await VisaProcess.findOneAndUpdate(
      { _id: id, 'paymentLinks.plId': plId },
      { 
        $set: { 
          'paymentLinks.$.status': rzpLink.status,
          // If paid, maybe update the overall payment status too
          ...(rzpLink.status === 'paid' ? { 
            visaFeePaymentStatus: 'Completed',
            stage: 'payment_completed'
          } : {})
        } 
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedClient.paymentLinks.find(l => l.plId === plId) });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay Payment
 * @route POST /api/visa-agent/clients/:id/payment/verify
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const payment = await paymentService.processPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    await VisaProcess.findByIdAndUpdate(req.params.id, {
      'paymentTypes.portalFeeStatus': 'Done',
      visaFeePaymentStatus: 'Completed',
      stage: 'payment_completed'
    });

    res.status(200).json({ success: true, message: 'Payment verified successfully', data: payment });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Payment Plans
 * @route GET /api/visa-agent/payment/plans
 */
exports.getPaymentPlans = async (req, res, next) => {
  try {
    const plans = [{ id: 1, name: 'Portal Fee', amount: 15000 }];
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Payments
 * @route GET /api/visa-agent/clients/:id/payments
 */
exports.getPayments = async (req, res, next) => {
  try {
    const PaymentModel = require('../payment/model');
    const client = await VisaProcess.findById(req.params.id);
    const payments = await PaymentModel.find({ studentId: client.linkedUser });
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Appointment Monitoring
 * @route PATCH /api/visa-agent/clients/:id/appointment/monitoring
 */
exports.updateAppointmentMonitoring = async (req, res, next) => {
  try {
    const client = await VisaProcess.findByIdAndUpdate(
      req.params.id, 
      { 
        appointmentStatus: 'Monitoring',
        stage: 'monitoring_slots'
      }, 
      { new: true }
    );
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Book Appointment
 * @route PATCH /api/visa-agent/clients/:id/appointment/booked
 */
exports.bookAppointment = async (req, res, next) => {
  try {
    const { biometricDate, interviewDate, location } = req.body;
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, {
      appointmentStatus: 'Booked',
      biometricDate,
      interviewDate,
      appointmentLocation: location,
      stage: 'appointment_booked'
    }, { new: true });

    // Notify client about booked dates
    const { triggerNotification } = require('../notification/service');
    triggerNotification({
      userId: client.linkedUser,
      eventKey: 'VISA_APPOINTMENT_BOOKED',
      data: {
        biometricDate,
        interviewDate,
        location
      },
      channels: ['app', 'email', 'whatsapp']
    }).catch(console.error);

    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Reschedule Appointment
 * @route PATCH /api/visa-agent/clients/:id/appointment/reschedule
 */
exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const { reschedule, notes } = req.body;
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, {
      rescheduleNeeded: reschedule,
      $push: { notes: notes }
    }, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Slot Confirmation
 * @route PATCH /api/visa-agent/clients/:id/slot-confirmation
 */
exports.slotConfirmation = async (req, res, next) => {
  try {
    const { status } = req.body; // Pending / Confirmed
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, { slotBookingStatus: status }, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Confirmation Page
 * @route POST /api/visa-agent/clients/:id/confirmation-page
 */
exports.uploadConfirmationPage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileUrl = req.file.path || req.file.location;
    const doc = { name: 'Confirmation Page', url: fileUrl };
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, { $push: { slotConfirmationDocs: doc } }, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Biometric Screening Update
 * @route PATCH /api/visa-agent/clients/:id/biometric-screening
 */
exports.updateBiometricScreening = async (req, res, next) => {
  try {
    const { status } = req.body; // 'Pending' or 'Completed'
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, { biometricStatus: status }, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Interview Screening Update
 * @route PATCH /api/visa-agent/clients/:id/interview-screening
 */
exports.updateInterviewScreening = async (req, res, next) => {
  try {
    const { status } = req.body; // 'Pending' or 'Completed'
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, { interviewStatus: status }, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Result Update
 * @route PATCH /api/visa-agent/clients/:id/result
 */
exports.updateResult = async (req, res, next) => {
  try {
    const { status } = req.body; // 'approved' or 'not_approved'
    const approvalStatus = status === 'approved' ? 'Approved' : 'Not approved';
    const stage = status === 'approved' ? 'approved' : 'rejected';
    const client = await VisaProcess.findByIdAndUpdate(req.params.id, { approvalStatus, stage }, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * Filter by Country
 * @route GET /api/visa-agent/clients/by-country/:country
 */
exports.getClientsByCountry = async (req, res, next) => {
  req.query.country = req.params.country;
  return exports.getClients(req, res, next);
};

/**
 * Filter by Visa Type
 * @route GET /api/visa-agent/clients/by-visa/:type
 */
exports.getClientsByVisa = async (req, res, next) => {
  req.query.visaType = req.params.type;
  return exports.getClients(req, res, next);
};

/**
 * Analytics
 * @route GET /api/visa-agent/analytics
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        approvalPercentage: 85,
        rejectionPercentage: 15,
        avgTimeline: '45 days',
        pendingLoad: 20
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark as Done (Manual Override)
 * @route PATCH /api/visa-agent/clients/:id/mark-done
 */
exports.markAsDone = async (req, res, next) => {
  try {
    const client = await VisaProcess.findByIdAndUpdate(
      req.params.id,
      { 
        manualStatus: 'Done',
        stage: 'approved', // Or another appropriate stage
        lastStatusUpdateAt: new Date()
      },
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Process marked as completed manually', data: client });
  } catch (error) {
    next(error);
  }
};
