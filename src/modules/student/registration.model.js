const mongoose = require('mongoose');

const studentRegistrationSchema = new mongoose.Schema({
  fullName: {
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
    trim: true,
  },
  passport: {
    type: String,
    trim: true,
  },
  interestedCountry: String,
  interestedUniversity: String,
  interestedLocation: String,
  interestedProgram: String,
  loanStatus: {
    type: String,
    enum: ['required', 'not_required', 'already_applied'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: String,
  adminNotes: String,
}, {
  timestamps: true,
});

const StudentRegistration = mongoose.model('StudentRegistration', studentRegistrationSchema);

module.exports = StudentRegistration;
