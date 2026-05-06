const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['Basic', 'Premium', 'Elite'],
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  gstPercentage: {
    type: Number,
    default: 18,
  },
  features: [{
    type: String,
    required: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan;
