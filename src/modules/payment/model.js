const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  gxId: {
    type: String, // Student's GX ID
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  razorpayOrderId: {
    type: String,
    required: true,
  },
  razorpayPaymentId: String,
  razorpaySignature: String,
  status: {
    type: String,
    enum: ['Created', 'Paid', 'Failed', 'Refunded'],
    default: 'Created',
  },
  description: String,
}, {
  timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
