const mongoose = require('mongoose');

const webinarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  topicType: {
    type: String,
    enum: [
      'Weekly policy updates', 
      'Visa rejection case breakdowns', 
      'Real cost analysis videos', 
      '“Mistakes parents make” series', 
      'Interview mock highlights',
      'Other'
    ],
    default: 'Other'
  },
  meetingLink: {
    type: String,
    required: true,
  },
  scheduledFor: {
    type: Date,
    required: true,
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Webinar', webinarSchema);
