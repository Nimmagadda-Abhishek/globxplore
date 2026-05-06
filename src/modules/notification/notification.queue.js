/**
 * Simplified Notification Runner (Non-Redis)
 * This replaces BullMQ when Redis is not available.
 * It handles asynchronous processing using setImmediate and setTimeout.
 */
const NotificationEngine = require('./notification.engine');

const addNotificationToQueue = async (notificationId, channels, delay = 0) => {
  if (delay > 0) {
    // For short delays, use setTimeout. 
    // Note: For long-term reliability without Redis, 
    // delayed notifications should be persisted in DB and picked up by a cron job.
    setTimeout(async () => {
      try {
        await NotificationEngine.processNotification(notificationId, channels);
      } catch (err) {
        console.error(`Delayed notification failed: ${err.message}`);
      }
    }, delay);
  } else {
    // Process immediately but asynchronously to not block the main request
    setImmediate(async () => {
      try {
        await NotificationEngine.processNotification(notificationId, channels);
      } catch (err) {
        console.error(`Immediate notification failed: ${err.message}`);
      }
    });
  }
};

module.exports = {
  addNotificationToQueue,
};
