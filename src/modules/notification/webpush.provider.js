const webpush = require('web-push');
const PushSubscription = require('./push-subscription.model');

// Configure VAPID credentials once on module load
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class WebPushProvider {
  /**
   * Send a web push notification to all active subscriptions for a user.
   * @param {string|ObjectId} userId
   * @param {Object} payload
   * @param {string} payload.title
   * @param {string} payload.body
   * @param {string} [payload.icon]
   * @param {string} [payload.url]   - URL to open when notification is clicked
   * @param {string} [payload.tag]   - Collapse key (replaces older notification with same tag)
   */
  static async send(userId, { title, body, icon, url, tag }) {
    const subscriptions = await PushSubscription.find({ userId });

    if (!subscriptions.length) {
      return { success: true, sent: 0, reason: 'No active push subscriptions' };
    }

    const pushPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/logo192.png',
      url: url || '/',
      tag: tag || 'globxplorer-notification',
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          pushPayload
        )
      )
    );

    // Clean up expired / invalid subscriptions (410 Gone or 404 Not Found)
    const expiredEndpoints = [];
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        const statusCode = result.reason?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(subscriptions[idx].endpoint);
        } else {
          console.error(
            `WebPush send failed for userId ${userId}:`,
            result.reason?.message || result.reason
          );
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: expiredEndpoints } });
      console.log(`WebPush: cleaned up ${expiredEndpoints.length} expired subscription(s) for user ${userId}`);
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    return { success: successCount > 0, sent: successCount, total: subscriptions.length };
  }
}

module.exports = WebPushProvider;
