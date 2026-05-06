const mongoose = require('mongoose');

const commissionRateSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  flatFee: {
    type: Number, // In case it's a flat bonus instead of a percentage
    default: 0,
  }
});

const commissionLogSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  amountEarned: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending',
  }
}, { timestamps: true });

const CommissionRate = mongoose.model('CommissionRate', commissionRateSchema);
const CommissionLog = mongoose.model('CommissionLog', commissionLogSchema);

module.exports = { CommissionRate, CommissionLog };
