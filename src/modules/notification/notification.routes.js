const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const pushController = require('./push.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

// All notification routes require authentication
router.use(protect);

// User preferences
router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreferences);

// Web Push subscription management
router.get('/push/vapid-key', pushController.getVapidKey);
router.post('/push/subscribe', pushController.subscribe);
router.delete('/push/unsubscribe', pushController.unsubscribe);
router.delete('/push/unsubscribe-all', pushController.unsubscribeAll);

// Web Push subscription management (Frontend expected routes)
router.get('/vapid-public-key', pushController.getVapidKey);
router.post('/push-subscription', pushController.subscribe);
router.delete('/push-subscription', pushController.unsubscribe);
router.post('/push/test', pushController.sendTestPush);

// Admin routes
router.post('/admin/broadcast', authorize('ADMIN'), notificationController.broadcast);
router.get('/admin/analytics', authorize('ADMIN'), notificationController.getAnalytics);
router.get('/admin/whatsapp-logs', authorize('ADMIN'), notificationController.getWhatsAppLogs);

// Internal trigger
router.post('/internal/trigger', notificationController.triggerInternal);

// Generic notification collection and parameterized item routes (must come AFTER static subpaths)
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
