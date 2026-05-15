const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  gxId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['ADMIN', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR', 'TELECALLER', 'STUDENT', 'VISA_AGENT', 'VISA_CLIENT', 'ALUMNI_MANAGER', 'ALUMNI'],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  profileImage: {
    type: String,
  },
  address: {
    type: String,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isApproved: {
    type: Boolean,
    default: true,
  },
  agentDetails: {
    businessName: { type: String },
    customerWhatsappNumber: { type: String },
    secondaryNumber: { type: String },
    locationUrl: { type: String },
    businessBoardPhoto: { type: String },
    mouFile: { type: String },
    accountDetails: { type: String },
    mouStatus: { 
      type: String, 
      enum: ['Completed', 'Not Completed'], 
      default: 'Not Completed' 
    },
    businessAreaName: { type: String },
    street: { type: String },
    lineNumber: { type: String },
    natureOfBusiness: { type: String },
    agentStatus: {
      type: String,
      enum: ['not_visited', 'visited', 'revisit', 'confirmed', 'not_interested', 'permanently_closed', 'partnered'],
      default: 'not_visited'
    },
    statusHistory: [
      {
        status: String,
        date: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastLogin: Date,
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  resetPasswordOtp: {
    type: String,
  },
  resetPasswordOtpExpires: {
    type: Date,
  },
  alumniDetails: {
    currentWorkingRole: { type: String },
    livingLocation: { type: String },
    workLocation: { type: String },
    availability: { type: String },
    shortBio: { type: String },
    passportDocs: [{ name: String, url: String }],
    visaDocs: [{ name: String, url: String }],
    university: { type: String },
    payoutBankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      branchName: String,
      ifscCode: String,
      swiftCode: String
    }
  },
}, {
  timestamps: true,
});

userSchema.pre('validate', function () {
  // Normalize agentStatus if it's using old capitalized format
  if (this.agentDetails && this.agentDetails.agentStatus) {
    const statusMap = {
      'Not visited': 'not_visited',
      'Closed': 'permanently_closed',
      'Revisit': 'revisit',
      'confirmed': 'confirmed'
    };
    if (statusMap[this.agentDetails.agentStatus]) {
      this.agentDetails.agentStatus = statusMap[this.agentDetails.agentStatus];
    }
  }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
