const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  allowApp: {
    type: Boolean,
    default: true,
  },
  allowWhatsApp: {
    type: Boolean,
    default: true,
  },
  allowEmail: {
    type: Boolean,
    default: true,
  },
  allowMarketing: {
    type: Boolean,
    default: false,
  },
  quietHoursStart: {
    type: String, // format "HH:mm"
    default: "22:00",
  },
  quietHoursEnd: {
    type: String, // format "HH:mm"
    default: "08:00",
  },
  language: {
    type: String,
    default: 'en',
  },
}, {
  timestamps: true,
});

const NotificationPreferences = mongoose.model('NotificationPreferences', notificationPreferencesSchema);

module.exports = NotificationPreferences;
