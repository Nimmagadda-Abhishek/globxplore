const alumniService = require('./alumni.service');
const { StudentRequest, CommunityPost, ServiceRequest, AlumniChatMessage } = require('./model');
const { AlumniService, AlumniPRStatus, AlumniCareerProgress } = require('./alumni.model');
const User = require('../user/model');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
  try {
    const { gxId, password } = req.body;
    const user = await User.findOne({ gxId }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.role !== 'ALUMNI') {
      return res.status(403).json({ message: 'Access denied. Alumni only.' });
    }
    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is pending approval from the Alumni Manager.' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, gxId: user.gxId } });
  } catch (error) { next(error); }
};

exports.register = async (req, res, next) => {
  try {
    const user = await alumniService.registerAlumni(req.body);
    res.status(201).json({ success: true, message: 'Alumni registered successfully', data: { gxId: user.gxId, name: user.name } });
  } catch (error) { next(error); }
};

exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res, next) => {
  try {
    const profile = await alumniService.getProfile(req.user.id);
    res.status(200).json({ profile });
  } catch (error) { next(error); }
};

// 2. Dashboard APIs
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Earnings (Total Cleared)
    const allPaid = await ServiceRequest.find({ 
      alumniId: userId, 
      paymentStatus: 'Paid' 
    });

    const totalEarned = allPaid
      .filter(r => r.isFundTransferred)
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    // 2. Active Service Definitions (Offered)
    const activeServiceTypes = await AlumniService.countDocuments({ 
      alumniId: userId, 
      status: 'Active' 
    });

    // 3. Service Bookings (ServiceRequest)
    const pendingBookings = await ServiceRequest.countDocuments({ alumniId: userId, status: 'Pending' });
    const completedBookings = await ServiceRequest.countDocuments({ alumniId: userId, status: 'Completed' });

    // 4. Mentorship Requests (StudentRequest)
    const pendingMentorships = await StudentRequest.countDocuments({ alumni: userId, status: 'Pending' });
    const resolvedMentorships = await StudentRequest.countDocuments({ alumni: userId, status: 'Resolved' });

    // 5. Students Helped (Unique)
    // We count students with at least one Completed booking OR one Resolved mentorship request
    const [bookingStudents, requestStudents] = await Promise.all([
      ServiceRequest.distinct('user', { alumniId: userId, status: 'Completed' }),
      StudentRequest.distinct('student', { alumni: userId, status: 'Resolved' })
    ]);
    const studentsHelped = new Set([...bookingStudents, ...requestStudents].map(id => id.toString())).size;

    // 6. Profile Completion
    const user = await User.findById(userId);
    const details = user.alumniDetails || {};
    const fields = ['university', 'currentWorkingRole', 'livingLocation', 'shortBio', 'availability'];
    const filledFields = fields.filter(f => details[f]);
    const profileCompletion = fields.length > 0 ? Math.round((filledFields.length / fields.length) * 100) : 100;

    // 7. Referrals
    const referralStats = await alumniService.getReferralSummary(userId);

    res.status(200).json({
      totalEarned,
      activeServiceTypes,
      completedServices: completedBookings, // Total services delivered
      pendingRequests: pendingMentorships + pendingBookings, // Total actions needed
      studentsHelped,
      profileCompletion,
      referralEarnings: referralStats.commissionEarned,
      referralCount: referralStats.referralCount
    });
  } catch (error) { next(error); }
};

exports.getDashboardActivity = async (req, res, next) => {
  try {
    const [recentRequests, recentServices] = await Promise.all([
      StudentRequest.find({ alumni: req.user.id }).sort({ createdAt: -1 }).limit(5).populate('student', 'name'),
      ServiceRequest.find({ alumniId: req.user.id }).sort({ createdAt: -1 }).limit(5).populate('user', 'name')
    ]);

    const activities = [
      ...recentRequests.map(r => ({
        id: r._id,
        type: 'REQUEST',
        message: `New request from ${r.student?.name || 'a student'}`,
        date: r.createdAt
      })),
      ...recentServices.map(s => ({
        id: s._id,
        type: 'SERVICE',
        message: `${s.paymentStatus === 'Paid' ? 'Payment received' : 'New booking'} for ${s.serviceName}`,
        date: s.createdAt
      }))
    ].sort((a, b) => b.date - a.date).slice(0, 5);

    res.status(200).json({ activities });
  } catch (error) { next(error); }
};

// 3. Profile APIs
exports.getProfile = async (req, res, next) => {
  try {
    const profile = await alumniService.getProfile(req.user.id);
    res.status(200).json({ profile });
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updated = await alumniService.updateProfile(req.user.id, req.body);
    res.status(200).json({ profile: updated });
  } catch (error) { next(error); }
};

// 4. Payment APIs
exports.getPayments = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find({ 
      alumniId: req.user.id,
      paymentStatus: 'Paid'
    }).sort({ createdAt: -1 });

    const payments = requests.map(r => ({
      id: r._id,
      service: r.serviceName,
      amount: r.cost,
      status: r.isFundTransferred ? 'Cleared' : 'Pending',
      date: r.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    }));

    res.status(200).json({ success: true, data: payments, payments }); // Handle both formats just in case
  } catch (error) { next(error); }
};

exports.getPaymentSummary = async (req, res, next) => {
  try {
    const allPaid = await ServiceRequest.find({ 
      alumniId: req.user.id, 
      paymentStatus: 'Paid' 
    });

    const totalEarned = allPaid
      .filter(r => r.isFundTransferred)
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    const pendingPayout = allPaid
      .filter(r => !r.isFundTransferred)
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = allPaid
      .filter(r => r.isFundTransferred && r.createdAt >= startOfMonth)
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    res.status(200).json({ 
      success: true,
      data: {
        totalEarned,
        pendingPayout,
        thisMonth,
        referralEarnings: 0 // Placeholder for now
      }
    });
  } catch (error) { next(error); }
};

exports.updateBankDetails = async (req, res, next) => {
  try {
    const profile = await alumniService.updateBankDetails(req.user.id, req.body);
    res.status(200).json({ profile });
  } catch (error) { next(error); }
};

// 5. Service APIs
exports.getServices = async (req, res, next) => {
  try {
    const services = await alumniService.getServices(req.user.id);
    res.status(200).json({ services });
  } catch (error) { next(error); }
};

exports.createService = async (req, res, next) => {
  try {
    const service = await alumniService.createService(req.user.id, req.body);
    res.status(201).json({ service });
  } catch (error) { next(error); }
};

exports.updateService = async (req, res, next) => {
  try {
    const service = await alumniService.updateService(req.user.id, req.params.id, req.body);
    res.status(200).json({ service });
  } catch (error) { next(error); }
};

exports.updateServiceStatus = async (req, res, next) => {
  try {
    const service = await alumniService.updateServiceStatus(req.user.id, req.params.id, req.body.status);
    res.status(200).json({ service });
  } catch (error) { next(error); }
};

exports.requestVerification = async (req, res, next) => {
  try {
    const service = await alumniService.requestServiceVerification(req.user.id, req.params.id);
    res.status(200).json({ message: 'Verification requested', service });
  } catch (error) { next(error); }
};

/**
 * Public/Student: Get all active services from alumni
 */
exports.getAllPublicServices = async (req, res, next) => {
  try {
    const services = await alumniService.getAllActiveServices();
    res.status(200).json({ success: true, data: services });
  } catch (error) { next(error); }
};

exports.bookService = async (req, res, next) => {
  try {
    const service = await AlumniService.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    
    // We can book services that are Approved/Active
    if (!['Pending', 'Accepted', 'Active'].includes(service.status)) {
       return res.status(400).json({ success: false, message: 'This service is not available for booking' });
    }

    const booking = await ServiceRequest.create({
      user: req.user.id,
      alumniId: service.alumniId,
      serviceId: service._id,
      serviceName: service.serviceType,
      description: service.description,
      cost: service.price,
      status: 'Pending',
      paymentStatus: 'Pending'
    });

    res.status(201).json({ success: true, message: 'Service booked successfully. Please proceed to payment.', data: booking });
  } catch (error) { next(error); }
};

// 6. Communication
exports.getRequests = async (req, res, next) => {
  try {
    const requests = await StudentRequest.find({ alumni: req.user.id }).populate('student', 'name');
    res.status(200).json({ requests });
  } catch (error) { next(error); }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const request = await StudentRequest.findOneAndUpdate({ _id: req.params.id, alumni: req.user.id }, { status: 'Assigned' }, { new: true });
    res.status(200).json({ request });
  } catch (error) { next(error); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const request = await StudentRequest.findOneAndUpdate({ _id: req.params.id, alumni: req.user.id }, { status: 'Rejected' }, { new: true });
    res.status(200).json({ request });
  } catch (error) { next(error); }
};

exports.getChat = async (req, res, next) => {
  try {
    const { id } = req.params; // serviceId
    const userId = req.user.id || req.user._id;
    const { studentId } = req.query;

    const service = await AlumniService.findById(id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    // Determine if the caller is the alumni who owns this service
    const isAlumniOwner = service.alumniId?.toString() === userId?.toString();

    let otherId;
    if (isAlumniOwner) {
      // Alumni viewing their own service chat — must specify which student thread
      otherId = studentId;
      if (!otherId) return res.status(400).json({ success: false, message: 'Student ID required for alumni to view chat' });
    } else {
      // Student (or any other role) — the other party is always the alumni
      otherId = service.alumniId;
    }

    const messages = await AlumniChatMessage.find({
      serviceId: id,
      $or: [
        { sender: userId, receiver: otherId },
        { sender: otherId, receiver: userId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name profileImage')
    .populate('receiver', 'name profileImage');

    res.status(200).json({ success: true, data: messages });
  } catch (error) { next(error); }
};


exports.sendChatMessage = async (req, res, next) => {
  try {
    const { id } = req.params; // serviceId
    const { message, receiverId } = req.body;
    const senderId = req.user.id || req.user._id;

    const service = await AlumniService.findById(id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const isAlumniOwner = service.alumniId?.toString() === senderId?.toString();

    // If the sender is NOT the alumni who owns this service, the receiver is always the alumni
    // If the sender IS the alumni, they must supply a receiverId (the student they're replying to)
    let finalReceiverId = isAlumniOwner ? receiverId : service.alumniId;

    if (!finalReceiverId) return res.status(400).json({ success: false, message: 'Receiver ID required' });

    const chatMessage = await AlumniChatMessage.create({
      sender: senderId,
      receiver: finalReceiverId,
      serviceId: id,
      message
    });

    res.status(201).json({ success: true, data: chatMessage });
  } catch (error) { next(error); }
};


exports.getChatThreads = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const messages = await AlumniChatMessage.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'name gxId profileImage')
    .populate('receiver', 'name gxId profileImage')
    .populate('serviceId', 'serviceType alumniId');

    const threads = [];
    const seen = new Set();

    for (const msg of messages) {
      const senderId = msg.sender?._id?.toString();
      const currentId = userId?.toString();
      const otherUserDoc = senderId === currentId ? msg.receiver : msg.sender;

      const serviceId = msg.serviceId?._id?.toString() || 'general';
      const otherUserId = otherUserDoc?._id?.toString();
      const key = `${otherUserId}-${serviceId}`;

      if (!seen.has(key)) {
        seen.add(key);
        threads.push({
          otherUser: {
            _id: otherUserId,
            name: otherUserDoc?.name,
            gxId: otherUserDoc?.gxId,
            profileImage: otherUserDoc?.profileImage,
          },
          service: msg.serviceId ? {
            _id: serviceId,
            serviceType: msg.serviceId.serviceType,
          } : null,
          lastMessage: msg.message,
          timestamp: msg.createdAt,
        });
      }
    }

    res.status(200).json({ success: true, data: threads });
  } catch (error) { next(error); }
};


// 7. Jobs
exports.getJobs = async (req, res, next) => {
  try {
    const jobs = await alumniService.getJobs(req.user.id);
    res.status(200).json({ jobs });
  } catch (error) { next(error); }
};

exports.createJob = async (req, res, next) => {
  try {
    const job = await alumniService.createJob(req.user.id, req.body);
    res.status(201).json({ job });
  } catch (error) { next(error); }
};

exports.getJobPerformance = async (req, res, next) => {
  try {
    const stats = await alumniService.getJobPerformance(req.user.id);
    res.status(200).json({ stats });
  } catch (error) { next(error); }
};

// 8. Training
exports.requestLanguageTraining = async (req, res, next) => {
  res.status(200).json({ message: 'Language training request submitted' });
};

exports.requestTechnicalTraining = async (req, res, next) => {
  res.status(200).json({ message: 'Technical training request submitted' });
};

// 9. Career
exports.addInternship = async (req, res, next) => {
  try {
    const milestone = await alumniService.addCareerMilestone(req.user.id, { ...req.body, milestoneType: 'internship' });
    res.status(201).json({ milestone });
  } catch (error) { next(error); }
};

exports.addCareerProgress = async (req, res, next) => {
  try {
    const milestone = await alumniService.addCareerMilestone(req.user.id, req.body);
    res.status(201).json({ milestone });
  } catch (error) { next(error); }
};

exports.getCareerAnalytics = async (req, res, next) => {
  try {
    const analytics = await alumniService.getCareerAnalytics(req.user.id);
    res.status(200).json({ analytics });
  } catch (error) { next(error); }
};

// 10. PR Tracker
exports.getPRStatus = async (req, res, next) => {
  try {
    const status = await alumniService.getPRStatus(req.user.id);
    res.status(200).json({ status });
  } catch (error) { next(error); }
};

exports.updatePRStatus = async (req, res, next) => {
  try {
    const status = await alumniService.updatePRStatus(req.user.id, req.body);
    res.status(200).json({ status });
  } catch (error) { next(error); }
};

exports.getPRTimelines = async (req, res, next) => {
  try {
    // For now, return empty or based on existing PR statuses if any
    const timelines = await AlumniPRStatus.aggregate([
      { $group: { _id: '$country', avgProgress: { $avg: '$progress' } } }
    ]);
    res.status(200).json({ timelines: timelines.length > 0 ? timelines : [] });
  } catch (error) { next(error); }
};

// 11. Stats
exports.getEmploymentStats = async (req, res, next) => {
  try {
    const totalAlumni = await User.countDocuments({ role: 'ALUMNI' });
    // This is a simplified metric: percentage of alumni with a 'currentWorkingRole'
    const employedAlumni = await User.countDocuments({ 
      role: 'ALUMNI', 
      'alumniDetails.currentWorkingRole': { $exists: true, $ne: '' } 
    });
    const rate = totalAlumni > 0 ? Math.round((employedAlumni / totalAlumni) * 100) : 0;
    res.status(200).json({ rate: `${rate}%`, total: totalAlumni });
  } catch (error) { next(error); }
};

exports.getSalaryRangeStats = async (req, res, next) => {
  try {
    // Real data from career progress salary milestones if available
    const milestones = await AlumniCareerProgress.find({ milestoneType: 'salary_growth' });
    if (milestones.length === 0) {
      return res.status(200).json({ ranges: [] });
    }
    // Simple aggregate for now
    res.status(200).json({ ranges: milestones.map(m => ({ info: m.description, detail: m.salaryDetails })) });
  } catch (error) { next(error); }
};

// 12. Referrals
exports.getReferrals = async (req, res, next) => {
  try {
    const referrals = await alumniService.getReferrals(req.user.id);
    res.status(200).json({ referrals });
  } catch (error) { next(error); }
};

exports.getReferralSummary = async (req, res, next) => {
  try {
    const summary = await alumniService.getReferralSummary(req.user.id);
    res.status(200).json({ summary });
  } catch (error) { next(error); }
};

exports.getReferralLink = async (req, res, next) => {
  res.status(200).json({ link: `https://globxplorer.com/register?ref=${req.user.id}` });
};

// 13. Ambassador
exports.applyAmbassador = async (req, res, next) => {
  try {
    const application = await alumniService.applyAmbassador(req.user.id, req.body);
    res.status(201).json({ application });
  } catch (error) { next(error); }
};

exports.getAmbassadorStatus = async (req, res, next) => {
  try {
    const applications = await alumniService.getAmbassadorStatus(req.user.id);
    res.status(200).json({ applications });
  } catch (error) { next(error); }
};

// 14. Content
exports.getMediaFeed = async (req, res, next) => {
  try {
    const feed = await CommunityPost.find({ type: 'General' }).populate('author', 'name');
    res.status(200).json({ feed });
  } catch (error) { next(error); }
};

// 15. Notifications
exports.getNotifications = async (req, res, next) => {
  res.status(200).json({ notifications: [] });
};
const paymentService = require('../payment/service');
const notificationService = require('../notification/service');

exports.initiateServicePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await ServiceRequest.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus === 'Paid') return res.status(400).json({ success: false, message: 'Already paid' });

    // We need student details to create order
    const student = await User.findById(req.user.id);

    // Create Razorpay Order
    // Note: Payment record is created inside createOrder
    const { order, paymentRecord } = await paymentService.createOrder(
      req.user.id,
      student.gxId,
      booking.cost,
      `Alumni Service: ${booking.serviceName}`,
      bookingId
    );

    res.status(201).json({ success: true, order, bookingId });
  } catch (error) { next(error); }
};

exports.verifyServicePayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;
    
    // Verify using central payment service
    const payment = await paymentService.processPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    // Update ServiceRequest
    await ServiceRequest.findByIdAndUpdate(bookingId, {
      paymentStatus: 'Paid',
      status: 'Paid',
      paymentId: payment._id
    });

    res.status(200).json({ success: true, message: 'Payment verified and service activated' });
  } catch (error) { next(error); }
};

exports.completeService = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await ServiceRequest.findOne({ _id: bookingId, user: req.user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus !== 'Paid') return res.status(400).json({ success: false, message: 'Service must be paid before completion' });

    booking.isCompleted = true;
    booking.status = 'Completed';
    await booking.save();

    // Notify Alumni Manager
    try {
      const ams = await User.find({ role: 'ALUMNI_MANAGER' });
      for (const am of ams) {
        await notificationService.triggerNotification({
          userId: am._id,
          eventKey: 'SERVICE_COMPLETED',
          data: {
            studentName: req.user.name,
            serviceName: booking.serviceName,
            actionUrl: `/alumni-manager/payouts`
          }
        });
      }
    } catch (notifError) {
      console.error('Failed to notify AM about service completion:', notifError);
    }

    res.status(200).json({ success: true, message: 'Service marked as completed. Funds will be transferred to alumni soon.' });
  } catch (error) { next(error); }
};
/**
 * @desc    Get my bookings (Student)
 * @route   GET /api/v1/alumni/services/bookings/my
 * @access  Private (Student)
 */
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await ServiceRequest.find({ user: req.user.id })
      .populate('alumniId', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) { next(error); }
};


exports.getAlumniBookings = async (req, res, next) => {
  try {
    const bookings = await ServiceRequest.find({ alumniId: req.user.id })
      .populate('user', 'name email gxId phone')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) { next(error); }
};


exports.markNotificationRead = async (req, res, next) => {
  res.status(200).json({ message: 'Marked as read' });
};
