const User = require('../user/model');
const { AlumniService, AlumniJob, AlumniCareerProgress, AlumniPRStatus, AlumniReferral, AmbassadorApplication } = require('./alumni.model');

const alumniService = {
  // Profile
  getProfile: async (userId) => {
    return User.findById(userId).select('-password');
  },
  
  updateProfile: async (userId, data) => {
    return User.findByIdAndUpdate(
      userId,
      { $set: { alumniDetails: data } },
      { new: true, runValidators: true }
    ).select('-password');
  },

  updateBankDetails: async (userId, data) => {
    return User.findByIdAndUpdate(
      userId,
      { $set: { 'alumniDetails.payoutBankDetails': data } },
      { new: true }
    ).select('-password');
  },

  // Services
  getServices: async (userId) => {
    return AlumniService.find({ alumniId: userId });
  },

  getAllActiveServices: async () => {
    return AlumniService.find({ status: { $in: ['Accepted', 'Active'] } }).populate('alumniId', 'name email gxId');
  },

  getPendingServices: async () => {
    return AlumniService.find({ status: 'Pending' }).populate('alumniId', 'name email gxId');
  },

  createService: async (userId, data) => {
    const service = new AlumniService({ ...data, alumniId: userId, status: 'Pending' });
    return service.save();
  },

  updateService: async (userId, serviceId, data) => {
    return AlumniService.findOneAndUpdate(
      { _id: serviceId, alumniId: userId },
      { $set: data },
      { new: true }
    );
  },

  updateServiceStatus: async (userId, serviceId, status) => {
    return AlumniService.findOneAndUpdate(
      { _id: serviceId, alumniId: userId },
      { $set: { status } },
      { new: true }
    );
  },

  requestServiceVerification: async (userId, serviceId) => {
    return AlumniService.findOneAndUpdate(
      { _id: serviceId, alumniId: userId },
      { $set: { status: 'Pending' } },
      { new: true }
    );
  },

  updateServiceReviewStatus: async (serviceId, status, rejectionReason = '') => {
    const update = { status };
    if (rejectionReason) update.rejectionReason = rejectionReason;
    return AlumniService.findByIdAndUpdate(serviceId, { $set: update }, { new: true });
  },

  // Jobs
  getJobs: async (userId) => {
    return AlumniJob.find({ alumniId: userId });
  },

  createJob: async (userId, data) => {
    const job = new AlumniJob({ ...data, alumniId: userId });
    return job.save();
  },

  getJobPerformance: async (userId) => {
    // Returns aggregate data or all jobs with performance stats
    return AlumniJob.find({ alumniId: userId }).select('title performance status');
  },

  // Career
  getCareerProgress: async (userId) => {
    return AlumniCareerProgress.find({ alumniId: userId }).sort({ dateAchieved: -1 });
  },

  addCareerMilestone: async (userId, data) => {
    const milestone = new AlumniCareerProgress({ ...data, alumniId: userId });
    return milestone.save();
  },

  getCareerAnalytics: async (userId) => {
    // Mock analytics
    return {
      salaryGrowth: [ { year: 2023, amount: 60000 }, { year: 2024, amount: 80000 } ]
    };
  },

  // PR
  getPRStatus: async (userId) => {
    return AlumniPRStatus.findOne({ alumniId: userId });
  },

  updatePRStatus: async (userId, data) => {
    let pr = await AlumniPRStatus.findOne({ alumniId: userId });
    if (!pr) {
      pr = new AlumniPRStatus({ alumniId: userId, ...data });
    } else {
      pr.stage = data.stage;
      if (data.country) pr.country = data.country;
      if (typeof data.progress !== 'undefined') pr.progress = data.progress;
    }
    pr.history.push({ stage: pr.stage, date: new Date() });
    return pr.save();
  },

  // Referrals
  getReferrals: async (userId) => {
    return AlumniReferral.find({ alumniId: userId }).populate('referredUser', 'name email');
  },

  getReferralSummary: async (userId) => {
    const referrals = await AlumniReferral.find({ alumniId: userId });
    const count = referrals.length;
    const earned = referrals.reduce((sum, r) => sum + r.commissionEarned, 0);
    return {
      referralCount: count,
      commissionEarned: earned,
      benefitsUnlocked: count > 5 ? ['Premium Badge', 'Extra 5% Commission'] : []
    };
  },

  // Ambassador
  applyAmbassador: async (userId, data) => {
    const application = new AmbassadorApplication({ ...data, alumniId: userId });
    return application.save();
  },

  getAmbassadorStatus: async (userId) => {
    return AmbassadorApplication.find({ alumniId: userId });
  },

  registerAlumni: async (data) => {
    const { name, email, phone, password, alumniDetails } = data;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) throw new Error('User with this email or phone already exists');

    // Generate GXID for Alumni
    const count = await User.countDocuments({ role: 'ALUMNI' });
    const gxId = `GXAL${(1000 + count + 1)}`;

    const user = new User({
      gxId,
      name,
      email,
      phone,
      password,
      role: 'ALUMNI',
      isApproved: false, // Must be approved by Alumni Manager
      isActive: true,
      alumniDetails: {
        ...alumniDetails,
        availability: 'Available'
      }
    });

    await user.save();
    return user;
  }
};

module.exports = alumniService;
