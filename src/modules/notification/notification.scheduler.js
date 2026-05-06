const cron = require('node-cron');
const Lead = require('../lead/model');
const Student = require('../student/model');
const VisaProcess = require('../visa/model');
const User = require('../user/model');
const Notification = require('./model');
const notificationService = require('./service');

const initNotificationScheduler = () => {
  // 1. Lead Follow-Up Reminders (Daily at 9:00 AM)
  cron.schedule('0 9 * * *', async () => {
    console.log('Running lead follow-up reminders...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const leads = await Lead.find({
      followUpDate: { $gte: today, $lt: tomorrow }
    }).populate('assignedTo handledByTelecaller');

    for (const lead of leads) {
      const assignee = lead.handledByTelecaller || lead.assignedTo;
      if (assignee) {
        await notificationService.sendRawNotification({
          userId: assignee._id,
          title: 'Lead Follow-Up Reminder',
          message: `Reminder: Follow-up with ${lead.name} (${lead.phone}) today.`,
          type: 'reminder',
          channels: ['app', 'email']
        });
      }
    }
  });

  // 2. Student Pipeline Stagnation (5+ Days)
  cron.schedule('0 10 * * *', async () => {
    console.log('Checking student stagnation...');
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const stagnantStudents = await Student.find({
      'stageHistory.timestamp': { $lte: fiveDaysAgo },
      pipelineStage: { $ne: 'Alumni Tracking' }
    }).populate('assignedCounsellor');

    for (const stu of stagnantStudents) {
      if (stu.assignedCounsellor) {
        await notificationService.sendRawNotification({
          userId: stu.assignedCounsellor._id,
          title: 'Student Stagnation Alert',
          message: `Student ${stu.name} (${stu.gxId}) has been in ${stu.pipelineStage} for over 5 days.`,
          type: 'escalation',
          priority: 'high',
          channels: ['app', 'email']
        });
      }
    }
  });

  // 3. Visa Interview Reminders (15, 7, 3, 1 days before)
  cron.schedule('0 8 * * *', async () => {
    console.log('Running visa interview reminders...');
    const now = new Date();
    const intervals = [1, 3, 7, 15];

    for (const days of intervals) {
      const targetDateStart = new Date(now);
      targetDateStart.setDate(targetDateStart.getDate() + days);
      targetDateStart.setHours(0, 0, 0, 0);
      
      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setDate(targetDateEnd.getDate() + 1);

      const visas = await VisaProcess.find({
        interviewDate: { $gte: targetDateStart, $lt: targetDateEnd }
      }).populate('userId');

      for (const visa of visas) {
        await notificationService.triggerNotification({
          userId: visa.userId._id,
          eventKey: 'INTERVIEW_SCHEDULED',
          data: {
            name: visa.userId.name,
            date: visa.interviewDate.toLocaleDateString()
          },
          channels: ['app', 'whatsapp', 'email']
        });
      }
    }
  });

  // 4. Payment Escalation (48h pending)
  cron.schedule('0 */4 * * *', async () => { // Every 4 hours
    console.log('Checking payment escalations...');
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const pendingPayments = await Notification.find({
      type: 'payment',
      status: 'queued',
      createdAt: { $lte: fortyEightHoursAgo }
    });

    const admin = await User.findOne({ role: 'ADMIN' });
    if (admin) {
      for (const payment of pendingPayments) {
        await notificationService.sendRawNotification({
          userId: admin._id,
          title: 'Critical: Payment Overdue Escalation',
          message: `Payment for User ID ${payment.userId} has been pending for over 48 hours.`,
          type: 'escalation',
          priority: 'critical',
          channels: ['app', 'email']
        });
      }
    }
  });

  console.log('Notification schedulers initialized.');
};

module.exports = { initNotificationScheduler };
