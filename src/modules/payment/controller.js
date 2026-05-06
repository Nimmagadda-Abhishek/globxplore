const paymentService = require('./service');
const notificationService = require('../notification/service');
const Student = require('../student/model');

/**
 * Create a payment request (Admin/Counsellor).
 */
exports.createPaymentRequest = async (req, res, next) => {
  try {
    const { studentId, gxId, title, amount, description, dueDate } = req.body;
    
    const request = await paymentService.createPaymentRequest({
      studentId,
      gxId,
      title,
      amount,
      description,
      dueDate,
      requestedBy: req.user._id
    });

    // Notify Student
    try {
      const student = await Student.findById(studentId).populate('userId');
      if (student && student.userId) {
        await notificationService.triggerNotification({
          userId: student.userId._id,
          eventKey: 'PAYMENT_REQUESTED',
          data: {
            name: student.name,
            amount: amount,
            title: title,
            actionUrl: `/student/payments`
          }
        });
      }
    } catch (notifError) {
      console.error('Failed to send payment request notification:', notifError);
    }

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment requests for the logged-in student.
 */
exports.getMyPaymentRequests = async (req, res, next) => {
  try {
    // We need the Student ID (from students collection), not the User ID
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(200).json({ success: true, data: [] });
    }
    const requests = await paymentService.getStudentPaymentRequests(student._id);
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate a new payment order for a student.
 */
exports.createPaymentOrder = async (req, res, next) => {
  try {
    let { studentId, gxId, amount, description, requestId } = req.body;

    // If only requestId is provided, fetch details from the PaymentRequest
    if (requestId && (!studentId || !amount)) {
      const PaymentRequest = require('./payment-request.model');
      const request = await PaymentRequest.findById(requestId).populate('studentId');
      if (!request) {
        return res.status(404).json({ success: false, message: 'Payment request not found' });
      }
      studentId = request.studentId._id;
      gxId = request.gxId;
      amount = request.amount;
      description = description || request.title;
    }

    if (!studentId || !amount) {
      return res.status(400).json({ success: false, message: 'Student ID and amount are required' });
    }

    const data = await paymentService.createOrder(studentId, gxId, amount, description, requestId);

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay payment and update transaction status.
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const payment = await paymentService.processPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    res.status(200).json({ success: true, message: 'Payment verified successfully', data: payment });
  } catch (error) {
    next(error);
  }
};
