const PushSubscription = require('./push-subscription.model');

/**
 * GET /api/notifications/push/vapid-key
 * Returns the VAPID public key to the frontend so it can subscribe.
 */
exports.getVapidKey = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(500).json({ success: false, message: 'VAPID public key not configured on server.' });
  }
  return res.status(200).json({ success: true, publicKey: key });
};

/**
 * POST /api/notifications/push/subscribe
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 * Saves (or upserts) the push subscription for the authenticated user.
 */
exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object. endpoint and keys (p256dh, auth) are required.' });
    }

    // Upsert — if the same endpoint re-subscribes, update it
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys,
        userAgent: userAgent || req.headers['user-agent'],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, message: 'Push subscription saved.' });
  } catch (error) {
    console.error('Push subscribe error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to save push subscription.' });
  }
};

/**
 * DELETE /api/notifications/push/unsubscribe
 * Body: { endpoint }
 * Removes the push subscription for the given endpoint (called on logout or manual opt-out).
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint is required.' });
    }

    await PushSubscription.deleteOne({ userId: req.user._id, endpoint });

    return res.status(200).json({ success: true, message: 'Push subscription removed.' });
  } catch (error) {
    console.error('Push unsubscribe error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to remove push subscription.' });
  }
};

/**
 * DELETE /api/notifications/push/unsubscribe-all
 * Removes ALL push subscriptions for the authenticated user (e.g., full logout from all devices).
 */
exports.unsubscribeAll = async (req, res) => {
  try {
    const result = await PushSubscription.deleteMany({ userId: req.user._id });
    return res.status(200).json({ success: true, message: `Removed ${result.deletedCount} push subscription(s).` });
  } catch (error) {
    console.error('Push unsubscribe-all error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to remove push subscriptions.' });
  }
};

/**
 * POST /api/notifications/push/test
 * Sends a sample test push notification to the current user (or counsellors).
 */
exports.sendTestPush = async (req, res) => {
  try {
    const WebPushProvider = require('./webpush.provider');
    const { title, body, url } = req.body;

    const pushTitle = title || 'Test Push Notification 🔔';
    const pushBody = body || 'This is a sample test push notification sent to your device.';
    const pushUrl = url || '/dashboard';

    const result = await WebPushProvider.send(req.user._id, {
      title: pushTitle,
      body: pushBody,
      url: pushUrl,
      tag: 'test-notification',
    });

    if (result.sent === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active Web Push subscriptions found for your account. Make sure push notifications are enabled in your browser settings.',
        result,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test push notification sent successfully to ${result.sent} device(s).`,
      result,
    });
  } catch (error) {
    console.error('Test Push error:', error.message);
    return res.status(500).json({ success: false, message: `Failed to send test push notification: ${error.message}` });
  }
};

