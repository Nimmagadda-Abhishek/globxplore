const Notification = require('./model');
const NotificationPreferences = require('./preferences.model');
const notificationService = require('./service');

exports.getNotifications = async (req, res, next) => {
  try {
    const { unread, type, priority, page = 1, limit = 20 } = req.query;
    
    const filter = { userId: req.user.id };
    if (unread === 'true') filter.read = false;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.status(200).json({ status: 'success', data: { count } });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ status: 'fail', message: 'Notification not found' });
    }

    res.status(200).json({ status: 'success', data: { notification } });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!notification) {
      return res.status(404).json({ status: 'fail', message: 'Notification not found' });
    }
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

exports.broadcast = async (req, res, next) => {
  try {
    const result = await notificationService.broadcastNotification(req.body);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

exports.triggerInternal = async (req, res, next) => {
  try {
    const { userId, eventKey, data, channels } = req.body;
    const notification = await notificationService.triggerNotification({ userId, eventKey, data, channels });
    res.status(201).json({ status: 'success', data: { notification } });
  } catch (error) {
    next(error);
  }
};

exports.getWhatsAppLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const logs = await Notification.find({ channels: 'whatsapp' })
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notification.countDocuments({ channels: 'whatsapp' });

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const analytics = await Notification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const readRate = await Notification.aggregate([
      {
        $group: {
          _id: '$read',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({ status: 'success', data: { analytics, readRate } });
  } catch (error) {
    next(error);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreferences.findOne({ userId: req.user.id });
    if (!prefs) prefs = await NotificationPreferences.create({ userId: req.user.id });
    res.status(200).json({ status: 'success', data: { preferences: prefs } });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const prefs = await NotificationPreferences.findOneAndUpdate(
      { userId: req.user.id },
      req.body,
      { new: true, upsert: true }
    );
    res.status(200).json({ status: 'success', data: { preferences: prefs } });
  } catch (error) {
    next(error);
  }
};
