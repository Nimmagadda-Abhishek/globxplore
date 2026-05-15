const agentService = require('./agent.service');

const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = { success, message };
  if (data !== null) {
    if (data.data) {
        response.data = data.data;
    } else {
        response.data = data;
    }
  }
  return res.status(statusCode).json(response);
};


exports.logout = async (req, res, next) => {
  try {
    // Logout typically handled on client side by removing token
    sendResponse(res, 200, true, 'Logged out successfully');
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const result = await agentService.getMe(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const result = await agentService.getDashboardSummary(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getDashboardUpdates = async (req, res, next) => {
  try {
    const result = await agentService.getDashboardUpdates();
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.createStudent = async (req, res, next) => {
  try {
    const result = await agentService.createStudent(req.user._id, req.user.gxId, req.body);
    sendResponse(res, 201, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getStudents = async (req, res, next) => {
  try {
    const result = await agentService.getStudents(req.user._id, req.query);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getStudentStatusSummary = async (req, res, next) => {
  try {
    const result = await agentService.getStudentStatusSummary(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getStudentById = async (req, res, next) => {
  try {
    const result = await agentService.getStudentById(req.user._id, req.params.id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const result = await agentService.updateStudent(req.user._id, req.params.id, req.body);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getStudentPipeline = async (req, res, next) => {
  try {
    const result = await agentService.getStudentPipeline(req.user._id, req.params.id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getCommissions = async (req, res, next) => {
  try {
    const result = await agentService.getCommissions(req.user._id, req.query);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getCommissionSummary = async (req, res, next) => {
  try {
    const result = await agentService.getCommissionSummary(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getBusinessProfile = async (req, res, next) => {
  try {
    const result = await agentService.getBusinessProfile(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.updateBusinessProfile = async (req, res, next) => {
  try {
    const result = await agentService.updateBusinessProfile(req.user._id, req.body);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.uploadBusinessBoardPhoto = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file provided');
    const result = await agentService.uploadBusinessBoardPhoto(req.user._id, req.file.location);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getBankDetails = async (req, res, next) => {
  try {
    const result = await agentService.getBankDetails(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.updateBankDetails = async (req, res, next) => {
  try {
    const result = await agentService.updateBankDetails(req.user._id, req.body);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.uploadMou = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file provided');
    const result = await agentService.uploadMou(req.user._id, req.file.location);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getMouDetails = async (req, res, next) => {
  try {
    const result = await agentService.getMouDetails(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getQrCode = async (req, res, next) => {
  try {
    const result = await agentService.getQrCode(req.user.gxId);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getReferralLink = async (req, res, next) => {
  try {
    const result = await agentService.getReferralLink(req.user.gxId);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getOffers = async (req, res, next) => {
  try {
    const result = await agentService.getOffers();
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getBenefits = async (req, res, next) => {
  try {
    const result = await agentService.getBenefits();
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const result = await agentService.getNotifications(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const result = await agentService.markNotificationRead(req.user._id, req.params.id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.contactAdmin = async (req, res, next) => {
  try {
    const result = await agentService.contactAdmin(req.user._id, req.body);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.requestServiceDetails = async (req, res, next) => {
  try {
    const result = await agentService.requestServiceDetails(req.user._id, req.body);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.searchStudents = async (req, res, next) => {
  try {
    const result = await agentService.searchStudents(req.user._id, req.query);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.searchBusiness = async (req, res, next) => {
  try {
    const result = await agentService.searchBusiness(req.user._id, req.query);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const result = await agentService.getAnalytics(req.user._id);
    sendResponse(res, 200, true, 'Success', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.createLead = async (req, res, next) => {
  try {
    const result = await agentService.createLead(req.user._id, req.body);
    sendResponse(res, 201, true, 'Lead created successfully', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};

exports.getLeads = async (req, res, next) => {
  try {
    const result = await agentService.getLeads(req.user._id, req.query);
    sendResponse(res, 200, true, 'Leads retrieved successfully', result);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};
