const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');
const Payment = require('./model');
const PaymentRequest = require('./payment-request.model');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a payment request for a student.
 */
exports.createPaymentRequest = async (data) => {
  const request = await PaymentRequest.create(data);
  return request;
};

/**
 * Get payment requests for a student.
 */
exports.getStudentPaymentRequests = async (studentId) => {
  return await PaymentRequest.find({ studentId }).sort({ createdAt: -1 });
};

/**
 * Get all payment requests (for Admin).
 */
exports.getAllPaymentRequests = async (query = {}) => {
  return await PaymentRequest.find(query).populate('studentId', 'name').sort({ createdAt: -1 });
};

/**
 * Create a new Razorpay order.
 * @param {string} studentId - Student ID.
 * @param {string} gxId - Student GX ID.
 * @param {number} amount - Amount in paise/cents.
 * @param {string} description - Payment description.
 * @param {string} requestId - Optional PaymentRequest ID to link.
 * @returns {Promise<Object>} - The created payment record and Razorpay order.
 */
exports.createOrder = async (studentId, gxId, amount, description, requestId = null) => {
  const options = {
    amount: amount * 100, // Razorpay amount is in smallest currency unit (e.g., paise)
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    notes: {
      studentId: studentId.toString(),
      gxId,
      requestId: requestId || '',
    },
  };

  let order;
  // Fallback for mock/development environment if real keys aren't set
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_key_id') {
    order = {
      id: `order_${crypto.randomBytes(8).toString('hex')}`,
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      status: 'created'
    };
  } else {
    order = await razorpay.orders.create(options);
  }

  const paymentRecord = await Payment.create({
    studentId,
    gxId,
    amount,
    razorpayOrderId: order.id,
    description,
    status: 'Created',
  });

  return { order, paymentRecord };
};

/**
 * Verify Razorpay payment signature.
 * @param {string} orderId - Razorpay order ID.
 * @param {string} paymentId - Razorpay payment ID.
 * @param {string} signature - Razorpay signature.
 * @returns {boolean} - Whether signature is valid.
 */
exports.verifySignature = (orderId, paymentId, signature) => {
  // Always verify as true in mock environment
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_key_id') {
    return true;
  }

  const text = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  return expectedSignature === signature;
};

/**
 * Update payment status after verification.
 */
exports.processPayment = async (orderId, paymentId, signature) => {
  const isValid = this.verifySignature(orderId, paymentId, signature);

  if (!isValid) {
    throw new Error('Invalid payment signature', 400);
  }

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId: orderId },
    {
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status: 'Paid',
    },
    { new: true }
  );

  // If this was linked to a PaymentRequest, update it
  try {
    const orderDetails = await razorpay.orders.fetch(orderId).catch(() => null);
    const requestId = orderDetails?.notes?.requestId || null;
    
    if (requestId) {
      await PaymentRequest.findByIdAndUpdate(requestId, {
        status: 'Paid',
        paymentId: payment._id
      });
    }
  } catch (err) {
    console.error('Failed to update PaymentRequest status:', err);
  }

  return payment;
};

/**
 * Create a Razorpay Payment Link.
 * @param {string} studentId - Student ID.
 * @param {string} gxId - Student GX ID.
 * @param {number} amount - Amount in paise/cents.
 * @param {string} description - Description.
 * @returns {Promise<Object>} - The created payment link.
 */
exports.createPaymentLink = async (studentId, gxId, amount, description) => {
  const options = {
    amount: amount * 100, // to paise
    currency: 'INR',
    accept_partial: false,
    description: description,
    customer: {
      name: '', // We should ideally get this from the user model
      email: '',
      contact: '',
    },
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
    notes: {
      studentId: studentId.toString(),
      gxId,
    },
  };

  // Fetch user details for the link
  const User = require('../user/model');
  const user = await User.findById(studentId);
  if (user) {
    options.customer.name = user.name;
    options.customer.email = user.email;
    options.customer.contact = user.phone;
  }

  let paymentLink;
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_key_id') {
    paymentLink = {
      id: `plink_${crypto.randomBytes(8).toString('hex')}`,
      short_url: `https://rzp.io/i/${crypto.randomBytes(4).toString('hex')}`,
      status: 'created'
    };
  } else {
    paymentLink = await razorpay.paymentLink.create(options);
  }

  // Create a payment record marked as 'Created'
  await Payment.create({
    studentId,
    gxId,
    amount,
    razorpayOrderId: paymentLink.id, // Using link ID as reference if no order
    description,
    status: 'Created',
  });

  return paymentLink;
};

exports.createPayout = async (userId, amount, bankDetails, purpose = 'payout') => {
  const { accountName, accountNumber, bankName, ifscCode } = bankDetails;

  if (!accountNumber || !ifscCode) {
    throw new Error('Incomplete bank details for payout');
  }

  // Fallback to mock if Razorpay X account number is missing or using default keys
  const isMockMode = !process.env.RAZORPAY_KEY_ID || 
                     process.env.RAZORPAY_KEY_ID === 'your_key_id' || 
                     !process.env.RAZORPAY_X_ACCOUNT_NUMBER;

  if (isMockMode) {
    return {
      id: `pout_${crypto.randomBytes(8).toString('hex')}`,
      status: 'processed',
      amount: amount * 100,
      currency: 'INR',
      mode: 'IMPS',
      reference_id: `ref_${Date.now()}`,
      mock: true
    };
  }

  try {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const config = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    // 1. Create Contact
    const contactRes = await axios.post('https://api.razorpay.com/v1/contacts', {
      name: accountName,
      type: 'vendor',
      reference_id: userId.toString(),
      notes: { userId: userId.toString() }
    }, config);
    const contact = contactRes.data;

    // 2. Create Fund Account
    const fundRes = await axios.post('https://api.razorpay.com/v1/fund_accounts', {
      contact_id: contact.id,
      account_type: 'bank_account',
      bank_account: {
        name: accountName,
        ifsc: ifscCode,
        account_number: accountNumber
      }
    }, config);
    const fundAccount = fundRes.data;

    // 3. Create Payout
    const payoutRes = await axios.post('https://api.razorpay.com/v1/payouts', {
      account_number: process.env.RAZORPAY_X_ACCOUNT_NUMBER,
      fund_account_id: fundAccount.id,
      amount: amount * 100, // in paise
      currency: 'INR',
      mode: 'IMPS',
      purpose: purpose,
      queue_if_low_balance: true,
      reference_id: `payout_${Date.now()}`
    }, config);

    return payoutRes.data;
  } catch (error) {
    const errorData = error.response?.data?.error || error;
    console.error('Razorpay Payout API Error:', errorData);
    throw new Error(`Payout failed: ${errorData.description || errorData.message || error.message}`);
  }
};
