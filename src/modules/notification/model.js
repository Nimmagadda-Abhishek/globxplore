const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  role: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['status', 'reminder', 'payment', 'chat', 'system', 'marketing', 'escalation'],
    default: 'system',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  channels: [{
    type: String,
    enum: ['app', 'whatsapp', 'email'],
    default: ['app'],
  }],
  read: {
    type: Boolean,
    default: false,
  },
  actionUrl: {
    type: String,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'failed'],
    default: 'queued',
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  sentAt: Date,
  deliveredAt: Date,
  failedAt: Date,
  whatsappMessageId: {
    type: String,
    index: true,
  },
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
