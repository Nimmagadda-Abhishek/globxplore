const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  targetModel: {
    type: String,
    enum: ['User', 'Student'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  followUpDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed', 'rejected'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  }
}, {
  timestamps: true,
});

const FollowUp = mongoose.model('FollowUp', followUpSchema);

module.exports = FollowUp;
