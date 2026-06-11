const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gxId: {
      type: String,
      required: true,
      index: true,
    },

    // Stored as a date normalized to midnight for easier querying.
    date: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['present', 'leave'],
      required: true,
      index: true,
    },

    // present details (optional on leave)
    loginTime: Date,
    logoutTime: Date,
    activeTimeMinutes: {
      type: Number,
      default: 0,
    },
    idleTimeMinutes: {
      type: Number,
      default: 0,
    },
    attendancePercent: {
      type: Number,
      default: 0,
    },

    // admin calculation metadata
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Ensure uniqueness per employee per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

