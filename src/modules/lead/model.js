const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  gxId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Use sparse since it might not be required
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  leadType: {
    type: String,
    enum: ['Lead', 'Agent'],
    default: 'Lead',
  },
  source: {
    type: String,
    enum: ['Website', 'Facebook Ads', 'Google Ads', 'Instagram', 'LinkedIn', 'Referral', 'Walk-in', 'Other', 'Agent Lead'],
    default: 'Website',
  },
  status: {
    type: String,
    enum: [
      'Lead received', 'Contacted', 'Call not answered', 
      'Declined', 'Call not reachable', 'Interested', 
      'Not interested', 'Call Again', 'Qualified', 'Ready to Apply'
    ],
    default: 'Lead received',
  },

  /**
   * Interest/qualification captured at lead creation.
   * (Frontend sends these values; they must exist in the Lead schema to be persisted.)
   */
  interestCountry: {
    type: String,
    trim: true,
  },
  course: {
    type: String,
    trim: true,
  },
  interestedLevel: {
    type: String,
    trim: true,
  },

  // Backward-compatible aliases for any older frontend misspellings.
  // These should be treated as aliases; mapping happens in controller.
  intrestCountry: {
    type: String,
    trim: true,
  },
  intrestedLevel: {
    type: String,
    trim: true,
  },
  intrestCourse: {
    type: String,
    trim: true,
  },

  assignedTo: {
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
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: [String],

  followUpDate: Date,
  lastInteractionDate: Date,
}, {
  timestamps: true,
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
