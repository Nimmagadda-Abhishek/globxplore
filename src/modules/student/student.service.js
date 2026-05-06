const Student = require('./model');
const User = require('../user/model');
const StudentRegistration = require('./registration.model');
const { generateGxId } = require('../../utils/gxIdGenerator');
const crypto = require('crypto');
const authService = require('../auth/service');

/**
 * Handle student self-registration request.
 */
exports.requestRegistration = async (data) => {
  const existing = await StudentRegistration.findOne({ email: data.email });
  if (existing && existing.status === 'pending') {
    throw new Error('Registration request already pending for this email.');
  }

  const registration = await StudentRegistration.create({
    ...data,
    status: 'pending'
  });

  // Notify admin logic would go here
  return registration;
};

/**
 * Get all pending registrations for admin.
 */
exports.getPendingRegistrations = async () => {
  return await StudentRegistration.find({ status: 'pending' }).sort({ createdAt: -1 });
};

/**
 * Approve a student registration.
 */
exports.approveRegistration = async (registrationId, adminUser) => {
  const registration = await StudentRegistration.findById(registrationId);
  if (!registration) throw new Error('Registration request not found');
  if (registration.status !== 'pending') throw new Error('Registration is already processed');

  // Generate GX ID
  const gxId = await generateGxId('STUDENT');
  
  // Generate temporary password
  const tempPassword = crypto.randomBytes(4).toString('hex');

  // Create User
  const user = await User.create({
    gxId,
    name: registration.fullName,
    email: registration.email,
    phone: registration.phone,
    role: 'STUDENT',
    password: tempPassword,
    mustChangePassword: true,
    createdBy: adminUser._id
  });

  // Create Student profile
  const student = await Student.create({
    gxId,
    userId: user._id,
    name: registration.fullName,
    email: registration.email,
    phone: registration.phone,
    interestedCountry: registration.interestedCountry,
    interestedUniversity: registration.interestedUniversity,
    interestedLocation: registration.interestedLocation,
    loanStatus: registration.loanStatus,
    referralCode: `REF-${gxId}`,
    referralLink: `https://gxcrm.com/ref/${gxId}`,
    createdBy: adminUser._id
  });

  // Update registration status
  registration.status = 'approved';
  await registration.save();

  // Send WhatsApp/Email logic would go here
  // Return credentials for response (admin can see or system can send)
  return { user, tempPassword, student };
};

/**
 * Reject a student registration.
 */
exports.rejectRegistration = async (registrationId, reason) => {
  const registration = await StudentRegistration.findById(registrationId);
  if (!registration) throw new Error('Registration request not found');
  
  registration.status = 'rejected';
  registration.rejectionReason = reason;
  await registration.save();

  return registration;
};

/**
 * Get student dashboard summary.
 */
exports.getStudentDashboard = async (userId) => {
  const student = await Student.findOne({ userId }).populate('assignedCounsellor', 'name email');
  if (!student) throw new Error('Student profile not found');

  // Calculate missing docs
  const requiredCategories = ['passport', 'photo', 'marksheet_10th', 'marksheet_12th', 'bachelors_transcripts', 'bachelors_degree', 'ielts_toefl_pte', 'sop'];
  const uploadedCategories = student.documents.map(d => d.category);
  const missingDocsCount = requiredCategories.filter(c => !uploadedCategories.includes(c)).length;

  // Calculate days remaining for subscription
  let daysRemaining = 0;
  if (student.subscription.expiresAt) {
    const diffTime = student.subscription.expiresAt.getTime() - Date.now();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    currentStage: student.pipelineStage,
    missingDocsCount,
    assignedCounsellor: student.assignedCounsellor ? student.assignedCounsellor.name : 'Not Assigned',
    subscription: {
      active: student.subscription.status !== 'none' && daysRemaining > 0,
      plan: student.subscription.status,
      expiry: daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'
    },
    pendingTasks: 0, // Placeholder
    notificationsCount: 0 // Placeholder
  };
};

/**
 * Get student pipeline history.
 */
exports.getStudentPipeline = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new Error('Student profile not found');

  const allStages = [
    'New', 'Counseling', 'Shortlisting', 'Application', 
    'Offer Letter', 'Visa Process', 'Enrolled'
  ];

  const timeline = allStages.map(stage => {
    const historyEntry = student.stageHistory.find(h => h.stage === stage);
    let status = 'upcoming';
    if (stage === student.pipelineStage) status = 'current';
    else if (historyEntry) status = 'completed';

    return {
      label: stage,
      status,
      date: historyEntry ? new Date(historyEntry.timestamp).toLocaleDateString() : (stage === student.pipelineStage ? 'Active' : 'Pending')
    };
  });

  return {
    currentStage: student.pipelineStage,
    timeline
  };
};

/**
 * Get student alerts.
 */
exports.getStudentAlerts = async (userId) => {
  const student = await Student.findOne({ userId });
  const alerts = [];

  // Check passport
  const hasPassport = student.documents.some(d => d.category === 'passport');
  if (!hasPassport) {
    alerts.push({ type: 'warning', message: 'Passport document is missing' });
  }

  // Check stage changes or other conditions
  return alerts;
};

/**
 * Update student profile.
 */
exports.updateStudentProfile = async (userId, updateData) => {
  // Restricted fields
  const restrictedFields = ['name', 'phone', 'email', 'passportNumber'];
  const attemptedRestricted = Object.keys(updateData).filter(key => restrictedFields.includes(key));
  
  if (attemptedRestricted.length > 0) {
    throw new Error(`Fields cannot be edited: ${attemptedRestricted.join(', ')}`);
  }

  const student = await Student.findOneAndUpdate({ userId }, updateData, { new: true });
  return student;
};

/**
 * Add document.
 */
exports.addDocument = async (userId, fileData) => {
  const student = await Student.findOneAndUpdate(
    { userId },
    { $push: { documents: fileData } },
    { 
      runValidators: false,
      returnDocument: 'after' 
    }
  );

  if (!student) throw new Error('Student profile not found');

  return student.documents[student.documents.length - 1];
};

/**
 * Create subscription order (Razorpay).
 */
exports.createSubscriptionOrder = async (userId, planId) => {
  const SubscriptionPlan = require('../subscription/model');
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new Error('Subscription plan not found');

  // Calculate amount in paise: (Price + GST) * 100
  const gstAmount = (plan.price * plan.gstPercentage) / 100;
  const totalAmount = plan.price + gstAmount;
  const amountInPaise = Math.round(totalAmount * 100);

  // Initialize Razorpay
  const Razorpay = require('razorpay');
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const options = {
    amount: amountInPaise,
    currency: plan.currency || 'INR',
    receipt: `sub_${Date.now()}_${userId.toString().slice(-4)}`,
    notes: {
      userId: userId.toString(),
      planId: plan._id.toString(),
      type: 'subscription'
    }
  };

  let order;
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('YOUR_TEST_KEY')) {
    // Mock if no key
    order = { id: `order_${crypto.randomBytes(8).toString('hex')}` };
  } else {
    order = await razorpay.orders.create(options);
  }
  
  return { 
    orderId: order.id, 
    planId: plan._id, 
    planName: plan.name,
    amount: amountInPaise, 
    currency: plan.currency,
    displayAmount: totalAmount
  };
};

/**
 * Create order for specific student fee/payment.
 */
exports.createFeeOrder = async (userId, paymentId) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new Error('Student not found');
  
  const payment = student.payments.id(paymentId);
  if (!payment) throw new Error('Payment request not found');

  // Initialize Razorpay
  const Razorpay = require('razorpay');
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const amountInPaise = Math.round(payment.amount * 100);
  const options = {
    amount: amountInPaise,
    currency: payment.currency || 'INR',
    receipt: `pay_${Date.now()}_${paymentId.toString().slice(-4)}`,
    notes: {
      userId: userId.toString(),
      paymentId: paymentId.toString(),
      type: 'fee'
    }
  };

  let order;
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('YOUR_TEST_KEY')) {
    order = { id: `pay_${crypto.randomBytes(8).toString('hex')}` };
  } else {
    order = await razorpay.orders.create(options);
  }

  payment.razorpayOrderId = order.id;
  await student.save();

  return {
    orderId: order.id,
    amount: amountInPaise,
    currency: payment.currency,
    paymentId: payment._id
  };
};

/**
 * Verify payment.
 */
exports.verifyPayment = async (userId, paymentData) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = paymentData;
  console.log(`[PaymentVerify] Start - User: ${userId}, Order: ${razorpay_order_id}, Plan: ${planId}`);
  
  // 1. Verify signature
  const crypto = require('crypto');
  const secret = process.env.RAZORPAY_KEY_SECRET;
  
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  console.log(`[PaymentVerify] Signature - Generated: ${generated_signature.substring(0,10)}..., Received: ${razorpay_signature.substring(0,10)}...`);

  const isSignatureValid = generated_signature === razorpay_signature;
  
  // Fallback for mock if no real keys
  const isMock = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('YOUR_TEST_KEY');

  if (!isSignatureValid && !isMock) {
    throw new Error('Invalid payment signature');
  }

  // 2. Update student subscription or payment
  const SubscriptionPlan = require('../subscription/model');
  const Payment = require('../payment/model');
  const plan = planId ? await SubscriptionPlan.findById(planId) : null;

  const student = await Student.findOne({ userId });
  if (!student) throw new Error('Student not found');

  // If planId was provided, it's a subscription upgrade
  if (planId || (plan && plan.name)) {
    student.subscription = {
      planId: plan ? plan._id : null,
      status: plan ? plan.name : 'Premium',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    // Record the payment in the global collection
    const planPrice = plan ? plan.price : 0;
    const gst = plan ? (plan.price * plan.gstPercentage) / 100 : 0;
    const totalAmount = planPrice + gst;

    await Payment.create({
      studentId: student._id,
      gxId: student.gxId,
      amount: totalAmount,
      currency: plan ? plan.currency : 'INR',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'Paid',
      description: `Subscription Upgrade: ${plan ? plan.name : 'Premium'}`
    });

    // Also add to student's local payments history
    student.payments.push({
      title: `${plan ? plan.name : 'Premium'} Subscription`,
      amount: totalAmount,
      currency: plan ? plan.currency : 'INR',
      status: 'paid',
      paidAt: new Date(),
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      description: `Upgrade to ${plan ? plan.name : 'Premium'} plan`
    });
  } else {
    // Check if it was a fee payment
    const payment = student.payments.find(p => p.razorpayOrderId === razorpay_order_id);
    if (payment) {
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.transactionId = razorpay_payment_id;

      // Also update the global Payment record if it exists
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: 'Paid',
        }
      );
    }
  }
  
  await student.save();
  console.log(`[PaymentVerify] Success - Student ${student.gxId} updated with subscription/payment`);
  return { success: true, student };
};
