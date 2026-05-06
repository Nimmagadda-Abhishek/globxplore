const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  gxId: {
    type: String, // Student's GX ID
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Cancelled'],
    default: 'Pending',
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment', // Linked to the actual payment once completed
  },
  dueDate: Date,
}, {
  timestamps: true,
});

const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);

module.exports = PaymentRequest;
