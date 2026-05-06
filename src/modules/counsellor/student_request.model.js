const mongoose = require('mongoose');

const studentRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: String,
  type: {
    type: String,
    required: true,
    // Examples: 'Need callback', 'Need SOP help', 'Need fee clarification'
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending',
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('StudentRequest', studentRequestSchema);
