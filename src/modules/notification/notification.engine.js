const Notification = require('./model');
const NotificationPreferences = require('./preferences.model');
const User = require('../user/model');
const EmailProvider = require('./email.provider');
const WhatsAppProvider = require('./whatsapp.provider');
const { sendRealTimeNotification, updateUnreadCount } = require('./notification.socket');
const { templates, interpolate } = require('./notification.templates');

class NotificationEngine {
  /**
   * Main entry point for processing a notification job from the queue
   */
  async processNotification(notificationId, targetChannels) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) throw new Error('Notification not found');

      const user = await User.findById(notification.userId);
      if (!user) throw new Error('User not found');

      const preferences = await this.getPreferences(user._id);

      const results = [];

      for (const channel of targetChannels) {
        if (this.isChannelAllowed(channel, preferences)) {
          const result = await this.sendThroughChannel(channel, user, notification);
          results.push({ channel, ...result });
        } else {
          console.log(`Channel ${channel} is disabled for user ${user._id}`);
          results.push({ channel, success: false, reason: 'Disabled by user preferences' });
        }
      }

      // Update notification status based on results
      await this.updateNotificationStatus(notification, results);

    } catch (error) {
      console.error('Notification Engine Error:', error.message);
      throw error; // Re-throw to allow BullMQ to retry
    }
  }

  async getPreferences(userId) {
    let prefs = await NotificationPreferences.findOne({ userId });
    if (!prefs) {
      prefs = await NotificationPreferences.create({ userId });
    }
    return prefs;
  }

  isChannelAllowed(channel, preferences) {
    switch (channel) {
      case 'app': return preferences.allowApp;
      case 'whatsapp': return preferences.allowWhatsApp;
      case 'email': return preferences.allowEmail;
      default: return false;
    }
  }

  async sendThroughChannel(channel, user, notification) {
    switch (channel) {
      case 'app':
        // Real-time via Socket.IO
        sendRealTimeNotification(user._id, notification);
        // Also trigger unread count update
        const unreadCount = await Notification.countDocuments({ userId: user._id, read: false });
        updateUnreadCount(user._id, unreadCount);
        return { success: true };

      case 'email':
        return await EmailProvider.sendEmail({
          to: user.email,
          subject: notification.title,
          html: this.getHtmlContent(notification),
        });

      case 'whatsapp':
        // If it's a template-based notification
        if (notification.metadata && notification.metadata.templateName) {
          return await WhatsAppProvider.sendTemplate(
            user.phone,
            notification.metadata.templateName,
            user.language || 'en',
            notification.metadata.components || []
          );
        } else {
          return await WhatsAppProvider.sendMessage(user.phone, notification.message);
        }

      default:
        return { success: false, reason: 'Unsupported channel' };
    }
  }

  getHtmlContent(notification) {
    // Check if we have a template function
    if (notification.metadata && notification.metadata.eventKey && templates[notification.metadata.eventKey]) {
      return templates[notification.metadata.eventKey].email(notification.metadata);
    }
    return `<p>${notification.message}</p>`;
  }

  async updateNotificationStatus(notification, results) {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else if (failureCount > 0) {
      notification.status = 'failed';
      notification.failedAt = new Date();
    }

    await notification.save();
  }
}

module.exports = new NotificationEngine();
