const mongoose = require('mongoose');

const visaProcessSchema = new mongoose.Schema({
  // Can link to either a Student or a direct standalone Visa Client
  linkedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clientId: {
    type: String, // E.g., The GXVC ID
    required: true,
  },
  visaType: {
    type: String, // E.g., B1, B2, F1, H1B, F2, H4
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // The Visa Agent
  },
  assignedAgentName: String,
  passport: String,
  aadhar: String,
  
  stage: {
    type: String,
    enum: [
      'client_created', 
      'ds160_pending', 
      'ds160_submitted', 
      'payment_pending', 
      'payment_completed', 
      'monitoring_slots', 
      'appointment_booked', 
      'biometric_completed', 
      'interview_completed', 
      'approved', 
      'rejected'
    ],
    default: 'client_created'
  },

  // Pipeline Flags
  slotBookingStatus: { type: String, enum: ['Pending', 'Confirmed'], default: 'Pending' },
  cutOffDates: String,
  locationPriority: String,
  rescheduleNeeded: { type: Boolean, default: false },
  
  ds160Status: { type: String, enum: ['Pending', 'Submitted'], default: 'Pending' },
  visaFeePaymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  appointmentStatus: { type: String, enum: ['None', 'Monitoring', 'Booked'], default: 'None' },
  
  // Dedicated Appointment Fields
  biometricDate: Date,
  interviewDate: Date,
  appointmentLocation: String,

  biometricStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  interviewStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Not approved'], default: 'Pending' },
  
  paymentTypes: {
    portalFeeStatus: { type: String, enum: ['Pending', 'Done'], default: 'Pending' },
    serviceFeeStatus: { type: String, enum: ['Pending', 'Done'], default: 'Pending' },
  },

  // Credentials
  ds160Credentials: {
    username: String,
    password: { type: String, select: false },
    confirmationNumber: String, // Added this
  },
  portalCredentials: {
    portalName: String,
    portalUrl: String,
    username: String, // Can be email or username
    password: { type: String, select: false }
  },
  
  manualStatus: { type: String, enum: ['Pending', 'Done'], default: 'Pending' }, // Added for manual override
  mandatoryDocs: [
    {
      name: { type: String }, 
      url: { type: String },
      category: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    }
  ],
  slotConfirmationDocs: [
    {
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  messages: [
    {
      sender: { type: String, enum: ['agent', 'student'], default: 'agent' },
      agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      mediaUrl: String,
      timestamp: { type: Date, default: Date.now },
      status: { type: String, enum: ['sent', 'delivered', 'read', 'received'], default: 'sent' }
    }
  ],
  lastMessageAt: Date,
  notes: [
    {
      content: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  
  paymentLinks: [
    {
      plId: String, // Razorpay Payment Link ID (plink_...)
      shortUrl: String,
      amount: Number,
      status: String, // created, partially_paid, paid, cancelled, expired
      description: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  
  lastStatusUpdateAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
});

// Update the delay tracker automatically
visaProcessSchema.pre('save', async function() {
  if (this.isModified('slotBookingStatus') || this.isModified('ds160Status') || this.isModified('appointmentStatus') || this.isModified('visaFeePaymentStatus') || this.isModified('stage')) {
    this.lastStatusUpdateAt = new Date();
  }
});

const VisaProcess = mongoose.model('VisaProcess', visaProcessSchema);
module.exports = VisaProcess;
