const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  gxId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  interestedCountry: String,
  interestedUniversity: String,
  interestedLocation: String,
  interestedProgram: String,
  loanStatus: {
    type: String,
    enum: ['required', 'not_required', 'already_applied', 'In Progress'],
  },
  universityType: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Private',
  },

  pipelineStage: {
    type: String,
    enum: [
      'New', 
      'Interested',
      'Qualified',
      'Ready to Apply',
      'Counseling', 
      'Shortlisting', 
      'Application', 
      'Offer Letter', 
      'Visa Process', 
      'Enrolled'
    ],
    default: 'New',
  },
  stageHistory: [
    {
      stage: String,
      comment: String,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      durationMs: {
        type: Number,
        default: 0
      }
    }
  ],

  assignedCounsellor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  sourceAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  handledByTelecaller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  educationBackground: String,
  percentage: String,
  passingYear: String,
  ieltsStatus: String,
  budgetRange: String,
  passportStatus: String,
  passportNumber: String,
  intake: String,
  alternateContact: String,

  referralCode: String,
  referralLink: String,

  subscription: {
    planId: String,
    status: {
      type: String,
      enum: ['none', 'Basic', 'Premium', 'Elite'],
      default: 'none',
    },
    expiresAt: Date,
  },

  documents: [
    {
      name: { type: String },
      url: { type: String },
      type: { type: String },
      category: {
        type: String,
        enum: [
          'passport', 'photo', 'national_id', 'birth_certificate',
          'marksheet_10th', 'marksheet_12th', 'diploma_transcripts', 
          'bachelors_transcripts', 'bachelors_degree', 'masters_transcripts', 'backlog_summary',
          'ielts_toefl_pte', 'gre_gmat_sat', 'duolingo',
          'sop', 'bank_statement', 'visa_docs', 'loan_docs', 'other',
          'Education', 'Identity'
        ],
        default: 'other'
      },
      verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      },
      visibility: {
        type: String,
        enum: ['Student', 'Office'],
        default: 'Office'
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],

  concerns: [
    {
      subject: String,
      message: String,
      status: {
        type: String,
        enum: ['open', 'resolved', 'escalated'],
        default: 'open'
      },
      createdAt: { type: Date, default: Date.now },
      resolvedAt: Date
    }
  ],

  alumniConnectRequests: [
    {
      alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
      },
      createdAt: { type: Date, default: Date.now }
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
  payments: [
    {
      title: String,
      amount: Number,
      currency: { type: String, default: 'INR' },
      status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      },
      dueDate: Date,
      paidAt: Date,
      transactionId: String,
      razorpayOrderId: String,
      description: String
    }
  ],
  notes: [String],
}, {
  timestamps: true,
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
