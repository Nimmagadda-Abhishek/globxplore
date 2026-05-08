const Notification = require('./model');
const { addNotificationToQueue } = require('./notification.queue');
const { templates, interpolate } = require('./notification.templates');
const User = require('../user/model');

/**
 * Trigger a notification based on a business event
 */
exports.triggerNotification = async ({ userId, eventKey, data, channels = ['app', 'email'] }) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const template = templates[eventKey];
    if (!template) throw new Error(`Template for event ${eventKey} not found`);

    const title = template.title;
    const message = interpolate(template.message, data);

    // Create WhatsApp components if template uses them
    const components = [];
    if (template.whatsapp) {
      // Simple heuristic: most templates use body parameters
      // We can improve this by defining a mapping in the template definition
      const parameters = [];
      
      // Match all {{var}} in the message
      const matches = template.message.match(/{{(\w+)}}/g);
      if (matches) {
        matches.forEach(match => {
          const key = match.replace(/{{|}}/g, '');
          if (data[key]) {
            parameters.push({ type: 'text', text: String(data[key]) });
          }
        });
      }

      if (parameters.length > 0) {
        components.push({
          type: 'body',
          parameters
        });
      }

      // 2. Header Parameter (Required since you added Image Headers to Meta templates)
      const headerImage = data.imageUrl || data.image || process.env.DEFAULT_HEADER_IMAGE;
      
      if (headerImage) {
        components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: headerImage
              }
            }
          ]
        });
      }
    }

    // Create notification record
    const notification = await Notification.create({
      userId,
      role: user.role,
      title,
      message,
      type: this.getEventType(eventKey),
      channels,
      metadata: { ...data, eventKey, templateName: template.whatsapp, components },
      status: 'queued',
    });

    // Add to BullMQ for processing
    await addNotificationToQueue(notification._id, channels);

    return notification;
  } catch (error) {
    console.error('Trigger Notification Error:', error.message);
    throw error;
  }
};

/**
 * Send a raw notification (e.g. for chat or admin broadcasts)
 */
exports.sendRawNotification = async ({ userId, title, message, type = 'system', channels = ['app'], actionUrl, metadata = {} }) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const notification = await Notification.create({
      userId,
      role: user.role,
      title,
      message,
      type,
      channels,
      actionUrl,
      metadata,
      status: 'queued',
    });

    await addNotificationToQueue(notification._id, channels);

    return notification;
  } catch (error) {
    console.error('Send Raw Notification Error:', error.message);
    throw error;
  }
};

exports.getEventType = (eventKey) => {
  if (eventKey.includes('PAYMENT')) return 'payment';
  if (eventKey.includes('REMINDER')) return 'reminder';
  if (eventKey.includes('STAGE') || eventKey.includes('STATUS')) return 'status';
  return 'system';
};

/**
 * Admin broadcast logic
 */
exports.broadcastNotification = async ({ targetRoles, targetCountries, title, message, channels, scheduledAt }) => {
  try {
    const filter = {};
    if (targetRoles && targetRoles.length > 0) filter.role = { $in: targetRoles };
    if (targetCountries && targetCountries.length > 0) filter['studentDetails.country'] = { $in: targetCountries };

    const users = await User.find(filter);
    
    const delay = scheduledAt ? new Date(scheduledAt) - new Date() : 0;

    const results = [];
    for (const user of users) {
      const notification = await Notification.create({
        userId: user._id,
        role: user.role,
        title,
        message,
        type: 'marketing',
        channels,
        status: 'queued',
      });

      await addNotificationToQueue(notification._id, channels, delay > 0 ? delay : 0);
      results.push(notification._id);
    }

    return { total: users.length, notificationIds: results };
  } catch (error) {
    console.error('Broadcast Notification Error:', error.message);
    throw error;
  }
};

/**
 * Direct Email Helper (Directly calls EmailProvider)
 */
exports.sendEmail = async (to, subject, html) => {
  const EmailProvider = require('./email.provider');
  return await EmailProvider.sendEmail({ to, subject, html });
};

/**
 * Direct WhatsApp Helper (Directly calls WhatsAppProvider)
 */
exports.sendWhatsApp = async (to, text) => {
  const WhatsAppProvider = require('./whatsapp.provider');
  return await WhatsAppProvider.sendMessage(to, text);
};
