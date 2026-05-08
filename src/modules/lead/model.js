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
    enum: ['Website', 'Facebook Ads', 'Google Ads', 'Instagram', 'LinkedIn', 'Referral', 'Walk-in', 'Other'],
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
