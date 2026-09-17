const mongoose = require('mongoose');

/**
 * Stores Web Push subscription objects for each user/browser combination.
 * A single user can have multiple subscriptions (different devices or browsers).
 */
const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    unique: true, // one record per browser subscription
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: {
    type: String, // optional — helpful for debugging which device
  },
}, {
  timestamps: true,
});

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

module.exports = PushSubscription;
