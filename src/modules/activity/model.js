const mongoose = require('mongoose');

// Session Schema
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gxId: {
    type: String,
    required: true,
  },
  loginTime: {
    type: Date,
    default: Date.now,
  },
  logoutTime: Date,
  lastHeartbeat: {
    type: Date,
    default: Date.now,
  },
  activeTime: {
    type: Number, // Duration in minutes
    default: 0,
  },
  idleTime: {
    type: Number, // Duration in minutes
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'logged_out'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gxId: {
    type: String,
    required: true,
  },
  action: {
    type: String, // e.g., 'LOGIN', 'LOGOUT', 'UPDATE_STUDENT', 'UPLOAD_DOC'
    required: true,
  },
  module: String,
  metadata: Object,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Task Session Schema
const taskSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gxId: {
    type: String,
    required: true,
  },
  taskName: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
  duration: Number, // In minutes
  productivityScore: {
    type: Number,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

const Session = mongoose.model('Session', sessionSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
const TaskSession = mongoose.model('TaskSession', taskSessionSchema);

module.exports = {
  Session,
  ActivityLog,
  TaskSession,
};
