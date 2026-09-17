const Webinar = require('./model');
const Notification = require('../notification/model');
const User = require('../user/model');
const emailProvider = require('../notification/email.provider');
const { templates, interpolate } = require('../notification/notification.templates');

/**
 * Get all active/upcoming webinars.
 */
exports.getWebinars = async (req, res, next) => {
  try {
    const webinars = await Webinar.find({ scheduledFor: { $gte: new Date() } }).sort({ scheduledFor: 1 });
    res.status(200).json({ success: true, data: webinars });
  } catch (error) {
    next(error);
  }
};

/**
 * Schedule a new webinar.
 */
exports.createWebinar = async (req, res, next) => {
  try {
    const webinar = await Webinar.create({
      ...req.body,
      createdBy: req.user._id
    });

      // Notify all students via in-app notification
      try {
        const students = await User.find({ role: 'STUDENT', isActive: true });
        if (students.length > 0) {
          const notifications = students.map(student => ({
            userId: student._id,
            role: student.role || 'STUDENT',
            title: 'New Webinar Scheduled!',
            message: `A new session on "${webinar.topicType}: ${webinar.title}" has been scheduled for ${new Date(webinar.scheduledFor).toLocaleString()}. Don't miss out!`,
            type: 'system',
            metadata: {
              webinarId: webinar._id,
              topicType: webinar.topicType
            }
          }));
          await Notification.insertMany(notifications);

          // Send email invitations
          const emailPromises = students.map(student => {
            const html = templates.WEBINAR_INVITE.email({
              topic: webinar.title,
              date: new Date(webinar.scheduledFor).toLocaleString(),
              link: webinar.meetingLink || ''
            });
            const subject = interpolate(templates.WEBINAR_INVITE.title, { title: webinar.title });
            return emailProvider.sendEmail({
              to: student.email,
              subject,
              html,
            });
          });
          await Promise.all(emailPromises);
        }
      } catch (notifyError) {
        console.error('Failed to send webinar notifications:', notifyError);
        // Don't fail the webinar creation if notifications fail
      }

    res.status(201).json({ success: true, data: webinar });
  } catch (error) {
    next(error);
  }
};
