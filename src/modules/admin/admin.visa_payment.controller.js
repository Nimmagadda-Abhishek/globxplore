const VisaProcess = require('../visa/model');
const Payment = require('../payment/model');

// --- Visa APIs ---

exports.getVisas = async (req, res, next) => {
  try {
    const visas = await VisaProcess.find().populate('linkedUser', 'name gxId');
    res.status(200).json({ success: true, data: visas });
  } catch (error) {
    next(error);
  }
};

exports.getVisaById = async (req, res, next) => {
  try {
    const visa = await VisaProcess.findById(req.params.id).populate('linkedUser', 'name gxId').populate('assignedAgent', 'name gxId');
    if (!visa) return res.status(404).json({ success: false, message: 'Visa case not found' });
    res.status(200).json({ success: true, data: visa });
  } catch (error) {
    next(error);
  }
};

exports.updateVisaStatus = async (req, res, next) => {
  try {
    const { approvalStatus } = req.body;
    const visa = await VisaProcess.findByIdAndUpdate(req.params.id, { approvalStatus }, { new: true });
    res.status(200).json({ success: true, data: visa });
  } catch (error) {
    next(error);
  }
};

exports.getVisaAnalytics = async (req, res, next) => {
  try {
    const stats = await VisaProcess.aggregate([
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// --- Payment APIs ---

exports.getPayments = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentSummary = async (req, res, next) => {
  try {
    const summary = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

exports.initiateRefund = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    // Placeholder for Razorpay refund logic
    payment.status = 'Refunded';
    await payment.save();

    res.status(200).json({ success: true, message: 'Refund initiated successfully' });
  } catch (error) {
    next(error);
  }
};
