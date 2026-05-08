const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

// All notification routes require authentication
router.use(protect);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// User preferences
router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreferences);

// Admin routes
router.post('/admin/broadcast', authorize('ADMIN'), notificationController.broadcast);
router.get('/admin/analytics', authorize('ADMIN'), notificationController.getAnalytics);
router.get('/admin/whatsapp-logs', authorize('ADMIN'), notificationController.getWhatsAppLogs);

// Internal trigger (could be protected by a secret)
router.post('/internal/trigger', notificationController.triggerInternal);

module.exports = router;
