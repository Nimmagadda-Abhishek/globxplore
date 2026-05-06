const mongoose = require('mongoose');

const alumniServiceSchema = new mongoose.Schema({
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, required: true }, // e.g. "Accommodation Help"
  price: { type: Number, required: true },
  description: { type: String },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Active', 'Paused'], default: 'Pending' },
  rejectionReason: { type: String },
}, { timestamps: true });

const alumniJobSchema = new mongoose.Schema({
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  location: { type: String, required: true },
  salaryRange: { type: String },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  performance: {
    views: { type: Number, default: 0 },
    applicants: { type: Number, default: 0 },
    successfulHires: { type: Number, default: 0 },
    commissions: { type: Number, default: 0 }
  }
}, { timestamps: true });

const alumniCareerProgressSchema = new mongoose.Schema({
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  milestoneType: { type: String, enum: ['first_part_time', 'full_time', 'salary_growth', 'internship'], required: true },
  description: { type: String },
  dateAchieved: { type: Date, default: Date.now },
  salaryDetails: { type: String }
}, { timestamps: true });

const alumniPRStatusSchema = new mongoose.Schema({
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  country: { type: String, required: true },
  progress: { type: Number, default: 0 },
  stage: { type: String, enum: ['Eligible', 'Applied', 'In Review', 'Approved', 'Rejected', 'Expression of Interest', 'ITA Received', 'Biometrics Submitted', 'Medical Passed', 'PR Granted'], default: 'Eligible' },
  history: [{
    stage: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const alumniReferralSchema = new mongoose.Schema({
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCode: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Pending', 'Successful'], default: 'Pending' },
  commissionEarned: { type: Number, default: 0 }
}, { timestamps: true });

const ambassadorApplicationSchema = new mongoose.Schema({
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roleType: { type: String, enum: ['College Representative', 'Country Representative', 'University Ambassador'], required: true },
  status: { type: String, enum: ['Pending', 'In Review', 'Approved', 'Rejected'], default: 'Pending' },
  applicationDetails: { type: String }
}, { timestamps: true });

module.exports = {
  AlumniService: mongoose.model('AlumniService', alumniServiceSchema),
  AlumniJob: mongoose.model('AlumniJob', alumniJobSchema),
  AlumniCareerProgress: mongoose.model('AlumniCareerProgress', alumniCareerProgressSchema),
  AlumniPRStatus: mongoose.model('AlumniPRStatus', alumniPRStatusSchema),
  AlumniReferral: mongoose.model('AlumniReferral', alumniReferralSchema),
  AmbassadorApplication: mongoose.model('AmbassadorApplication', ambassadorApplicationSchema)
};
