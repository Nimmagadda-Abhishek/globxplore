const User = require('../user/model');
const Student = require('../student/model');
const Lead = require('../lead/model');
const { CommissionLog } = require('../commission/model');
const Notification = require('../notification/model');
const Offer = require('../offer/model');
const authService = require('../auth/service');
const { generateGxId } = require('../../utils/gxIdGenerator');

// 1. Authentication

exports.getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return user;
};

// 2. Dashboard
exports.getDashboardSummary = async (userId) => {
  const totalStudents = await Student.countDocuments({ sourceAgent: userId });
  const activeApplications = await Student.countDocuments({ 
    sourceAgent: userId, 
    pipelineStage: { $nin: ['Alumni Tracking', 'Review and Testimonials'] }
  });

  const commissions = await CommissionLog.find({ agentId: userId });
  let totalCommission = 0;
  let thisMonthEarnings = 0;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  commissions.forEach(c => {
    totalCommission += c.amountEarned;
    if (c.status === 'Paid' && c.updatedAt.getMonth() === currentMonth && c.updatedAt.getFullYear() === currentYear) {
      thisMonthEarnings += c.amountEarned;
    }
  });

  const conversionRate = totalStudents > 0 ? Math.round(((totalStudents - activeApplications) / totalStudents) * 100) : 0; // Simplified logic

  return {
    totalStudents,
    activeApplications,
    totalCommission,
    thisMonthEarnings,
    pendingFollowUps: 0, // Simplified
    conversionRate
  };
};

exports.getDashboardUpdates = async () => {
  return [
    { title: 'Weekly GX Service Update', description: 'New features added to the portal.' },
    { title: 'Visa Changes', description: 'UK visa rules updated for 2026.' }
  ];
};

// 3. Student
exports.createStudent = async (agentId, agentGxId, data) => {
  const existingPhone = await Student.findOne({ phone: data.contact });
  const existingEmail = await Student.findOne({ email: data.email });
  if (existingPhone || existingEmail) {
    throw new Error('Already existed');
  }

  const existingLeadPhone = await Lead.findOne({ phone: data.contact });
  if (existingLeadPhone) {
      throw new Error('Already existed in leads');
  }

  const gxId = await generateGxId('STUDENT');
  const student = await Student.create({
    gxId,
    name: data.fullName,
    phone: data.contact,
    email: data.email,
    country: data.country,
    sourceAgent: agentId,
    assignedAgent: agentId,
    createdBy: agentId,
    pipelineStage: 'Lead Received',
    stageHistory: [{ stage: 'Lead Received' }]
  });

  return student;
};

exports.getStudents = async (agentId, query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  let filter = { sourceAgent: agentId };
  if (query.country) filter.country = { $regex: new RegExp(query.country, 'i') };
  if (query.stage) filter.pipelineStage = { $regex: new RegExp(query.stage, 'i') };

  const students = await Student.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
  const total = await Student.countDocuments(filter);

  return {
    students,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

exports.getStudentById = async (agentId, studentId) => {
  const student = await Student.findOne({ _id: studentId, sourceAgent: agentId });
  if (!student) throw new Error('Student not found or access denied');
  return student;
};

exports.updateStudent = async (agentId, studentId, data) => {
  const student = await Student.findOne({ _id: studentId, sourceAgent: agentId });
  if (!student) throw new Error('Student not found or access denied');

  if (data.contact && data.contact !== student.phone) {
    const existing = await Student.findOne({ phone: data.contact });
    if (existing) throw new Error('Contact already exists');
    student.phone = data.contact;
  }
  
  if (data.name) student.name = data.name;
  if (data.country) student.country = data.country;
  
  await student.save();
  return student;
};

// 4. Pipeline
exports.getStudentPipeline = async (agentId, studentId) => {
  const student = await Student.findOne({ _id: studentId, sourceAgent: agentId });
  if (!student) throw new Error('Student not found or access denied');

  return {
    student: student.gxId,
    currentStage: student.pipelineStage,
    history: student.stageHistory
  };
};

exports.getStudentStatusSummary = async (agentId) => {
  const summary = await Student.aggregate([
    { $match: { sourceAgent: agentId } },
    { $group: { _id: '$pipelineStage', count: { $sum: 1 } } }
  ]);
  
  const formattedSummary = {};
  summary.forEach(item => {
    formattedSummary[item._id] = item.count;
  });
  return formattedSummary;
};

// 5. Commission
exports.getCommissions = async (agentId, query) => {
  let filter = { agentId };
  if (query.country) filter.country = { $regex: new RegExp(query.country, 'i') };
  if (query.status) filter.status = { $regex: new RegExp(query.status, 'i') };

  const commissions = await CommissionLog.find(filter).populate('studentId', 'name gxId').sort({ createdAt: -1 });
  return commissions;
};

exports.getCommissionSummary = async (agentId) => {
  const commissions = await CommissionLog.find({ agentId });
  let total = 0;
  let paid = 0;
  let pending = 0;
  let countryWise = {};

  commissions.forEach(c => {
    total += c.amountEarned;
    if (c.status === 'Paid') paid += c.amountEarned;
    if (c.status === 'Pending') pending += c.amountEarned;
    
    if (!countryWise[c.country]) countryWise[c.country] = 0;
    countryWise[c.country] += c.amountEarned;
  });

  return { total, paid, pending, countryWise };
};

// 6. Business Profile
exports.getBusinessProfile = async (userId) => {
  const user = await User.findById(userId);
  return user.agentDetails || {};
};

exports.updateBusinessProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user.agentDetails) user.agentDetails = {};

  if (data.businessName) user.agentDetails.businessName = data.businessName;
  if (data.whatsapp) user.agentDetails.customerWhatsappNumber = data.whatsapp;
  if (data.secondaryNumber) user.agentDetails.secondaryNumber = data.secondaryNumber;
  if (data.location) user.agentDetails.businessAreaName = data.location;
  if (data.services) user.agentDetails.natureOfBusiness = Array.isArray(data.services) ? data.services.join(', ') : data.services;

  await user.save();
  return user.agentDetails;
};

exports.uploadBusinessBoardPhoto = async (userId, fileUrl) => {
  const user = await User.findById(userId);
  if (!user.agentDetails) user.agentDetails = {};
  user.agentDetails.businessBoardPhoto = fileUrl;
  await user.save();
  return { businessBoardPhoto: fileUrl };
};

// 7. Bank Details
exports.getBankDetails = async (userId) => {
  const user = await User.findById(userId);
  if (user.agentDetails && user.agentDetails.accountDetails) {
    try {
      return JSON.parse(user.agentDetails.accountDetails);
    } catch(e) {
      return {};
    }
  }
  return {};
};

exports.updateBankDetails = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user.agentDetails) user.agentDetails = {};
  
  user.agentDetails.accountDetails = JSON.stringify({
    accountHolder: data.accountHolder,
    bankName: data.bankName,
    accountNo: data.accountNo,
    ifsc: data.ifsc
  });
  await user.save();
  return { message: 'Bank details updated successfully' };
};

// 8. MOU
exports.uploadMou = async (userId, fileUrl) => {
  const user = await User.findById(userId);
  if (!user.agentDetails) user.agentDetails = {};
  user.agentDetails.mouFile = fileUrl;
  user.agentDetails.mouStatus = 'Completed';
  await user.save();
  return { mouFile: fileUrl, mouStatus: 'Completed' };
};

exports.getMouDetails = async (userId) => {
  const user = await User.findById(userId);
  return {
    mouFile: user.agentDetails?.mouFile,
    mouStatus: user.agentDetails?.mouStatus || 'Not Completed'
  };
};

// 9. QR Code
exports.getQrCode = async (gxId) => {
  return { qrData: `https://gxcrm.com/ref/${gxId}` }; // Could use a library to generate actual QR data
};

exports.getReferralLink = async (gxId) => {
  return { link: `https://gxcrm.com/ref/${gxId}` };
};

// 10. Offers & Benefits
exports.getOffers = async () => {
  return await Offer.find({ isActive: true });
};

exports.getBenefits = async () => {
  return [
    { title: 'Forex Benefits', description: 'Get 1% cashback on forex transfers.' },
    { title: 'Premium Discount', description: '20% off on application fees for partner universities.' }
  ];
};

// 11. Notifications
exports.getNotifications = async (userId) => {
  return await Notification.find({ recipient: userId }).sort({ createdAt: -1 });
};

exports.markNotificationRead = async (userId, notifId) => {
  const notif = await Notification.findOne({ _id: notifId, recipient: userId });
  if (!notif) throw new Error('Notification not found');
  notif.isRead = true;
  await notif.save();
  return notif;
};

// 12. Support
exports.contactAdmin = async (userId, data) => {
  // In a real scenario, this would send an email or create a ticket.
  return { message: 'Request sent to admin', subject: data.subject };
};

exports.requestServiceDetails = async (userId, data) => {
  return { message: 'Service details request sent successfully' };
};

// 13. Search
exports.searchStudents = async (agentId, query) => {
  const searchTerm = query.q || '';
  return await Student.find({
    sourceAgent: agentId,
    $or: [
      { name: { $regex: new RegExp(searchTerm, 'i') } },
      { email: { $regex: new RegExp(searchTerm, 'i') } },
      { phone: { $regex: new RegExp(searchTerm, 'i') } }
    ]
  }).limit(10);
};

exports.searchBusiness = async (agentId, query) => {
  return { message: 'Business search results', data: [] }; // Mock for now
};

// 14. Analytics
exports.getAnalytics = async (agentId) => {
  const students = await Student.find({ sourceAgent: agentId });
  const total = students.length;
  const active = students.filter(s => !['Alumni Tracking', 'Review and Testimonials'].includes(s.pipelineStage)).length;
  const conversionPercent = total > 0 ? Math.round(((total - active) / total) * 100) : 0;
  
  return {
    monthlyReferrals: total,
    conversionPercent,
    earningsTrend: [12000, 15000, 10000],
  };
};

// 15. Lead Management
exports.createLead = async (agentId, data) => {
  const existingLead = await Lead.findOne({ phone: data.phone });
  if (existingLead) {
    throw new Error('Lead with this phone number already exists');
  }

  const gxId = await generateGxId('LEAD');
  const lead = await Lead.create({
    gxId,
    name: data.name,
    phone: data.phone,
    email: data.email,
    source: 'Direct Referrals',
    sourceAgent: agentId,
    assignedTo: agentId,
    status: 'Lead received'
  });

  return lead;
};

exports.getLeads = async (agentId, query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const leads = await Lead.find({ sourceAgent: agentId })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Lead.countDocuments({ sourceAgent: agentId });

  return {
    leads,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};
