const cron = require('node-cron');
const Lead = require('../lead/model');
const { sendEmail, sendWhatsApp } = require('./service');

/**
 * Initialize all cron jobs.
 */
const initCronJobs = () => {
  // Check for follow-ups every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('Running daily follow-up reminder cron job...');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Standard follow up dates
      const leadsToFollowUp = await Lead.find({
        followUpDate: { $gte: todayStart, $lte: todayEnd },
      }).populate('assignedTo handledByTelecaller');

      for (const lead of leadsToFollowUp) {
        const assignee = lead.handledByTelecaller || lead.assignedTo;
        if (assignee) {
          const message = `Reminder: You have a scheduled follow-up today with lead ${lead.name} (${lead.phone}).`;
          await sendEmail(assignee.email, 'Lead Follow-Up Reminder', message);
          await sendWhatsApp(assignee.phone, message);
        }
      }

      // Everyday Reminders ('Call Again', 'Call not answered', 'Declined')
      const dailyReminderLeads = await Lead.find({
        status: { $in: ['Call Again', 'Call not answered', 'Declined'] }
      }).populate('assignedTo handledByTelecaller');

      for (const lead of dailyReminderLeads) {
        const assignee = lead.handledByTelecaller || lead.assignedTo;
        if (assignee) {
          const message = `Daily Alert: Lead ${lead.name} is currently resting on status [${lead.status}]. Please follow up.`;
          await sendEmail(assignee.email, `Lead Requires Attention: ${lead.status}`, message);
        }
      }

      // 20-Day Reminders ('Not interested')
      const twentyDaysAgoStart = new Date(todayStart);
      twentyDaysAgoStart.setDate(twentyDaysAgoStart.getDate() - 20);
      const twentyDaysAgoEnd = new Date(todayEnd);
      twentyDaysAgoEnd.setDate(twentyDaysAgoEnd.getDate() - 20);

      const twentyDayLeads = await Lead.find({
        status: 'Not interested',
        lastInteractionDate: { $gte: twentyDaysAgoStart, $lte: twentyDaysAgoEnd }
      }).populate('assignedTo handledByTelecaller');

      for (const lead of twentyDayLeads) {
        const assignee = lead.handledByTelecaller || lead.assignedTo;
        if (assignee) {
          const message = `20-Day Alert: It has been exactly 20 days since Lead ${lead.name} (${lead.phone}) was marked "Not interested". Reach out again securely!`;
          await sendEmail(assignee.email, 'Lead Revival Opportunity', message);
        }
      }

      // Student Stage Stagnation Alarms (5+ Days)
      const Student = require('../student/model');
      
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const stagnantStudents = await Student.aggregate([
        {
          $addFields: {
            currentStageObject: { $arrayElemAt: ["$stageHistory", -1] }
          }
        },
        {
          $match: {
            "currentStageObject.timestamp": { $lte: fiveDaysAgo },
            pipelineStage: { $nin: ['Alumni Tracking'] }
          }
        }
      ]);

      const User = require('../user/model');
      for (const stu of stagnantStudents) {
        if (stu.assignedCounsellor) {
          const counsellor = await User.findById(stu.assignedCounsellor);
          if (counsellor) {
            const message = `Stagnation Alert: Student ${stu.name} (${stu.gxId}) has been stuck in the '${stu.pipelineStage}' stage for over 5 days.`;
            await sendEmail(counsellor.email, 'Student Pipeline Alert', message);
          }
        }
      }

      // Visa Client Stagnation Alerts (24hr / 48hr delay on active process logic)
      const VisaProcess = require('../visa/model');
      
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

      const delayedVisas = await VisaProcess.find({
        approvalStatus: 'Pending',
        lastStatusUpdateAt: { $lte: twentyFourHoursAgo }
      }).populate('assignedAgent');

      for (const visa of delayedVisas) {
        // Calculate raw hours passed since last action
        const diffMs = new Date() - visa.lastStatusUpdateAt;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHrs >= 48) {
          // Send to Admin
          await sendEmail('admin@globxplorer.com', 'Visa Pipeline Critical Delay (48hr+)', `Visa Client ${visa.clientId} (Type: ${visa.visaType}) has sat inactive for over 48 hours.`);
        } else if (diffHrs >= 24 && visa.assignedAgent) {
          // Send to Visa Agent
          await sendEmail(visa.assignedAgent.email, 'Visa Pipeline Warning (24hr+)', `Warning: Visa Client ${visa.clientId}'s pipeline has had zero status activity for 24 hours. Please address.`);
        }
      }

      console.log(`Sent reminders for ${leadsToFollowUp.length} scheduled, ${dailyReminderLeads.length} daily status alerts, ${stagnantStudents.length} stagnant students, and computed constraints for ${delayedVisas.length} delayed visa operations.`);
    } catch (error) {
      console.error('Error in daily follow-up cron job:', error);
    }
  });

  // Check Agent Status every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    try {
      console.log('Running agent unvisited alarm job...');
      const User = require('../user/model');
      
      const unvisitedAgents = await User.find({
        role: 'AGENT',
        'agentDetails.agentStatus': 'Not visited'
      }).populate('createdBy');

      const now = new Date();
      
      for (const agent of unvisitedAgents) {
        const diffMs = now - agent.createdAt;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 4) {
          // 4th Day -> Email Admin
          await sendEmail('admin@globxplorer.com', 'Agent Still Not Visited', `The agent ${agent.name} (${agent.gxId}) has been created for 4+ days and is still Not Visited.`);
        } else if (diffDays >= 1 && agent.createdBy) {
          // Send alarm to Agent Manager on days 1, 2, 3
          const manager = agent.createdBy;
          await sendEmail(manager.email, 'Agent Visit Reminder', `Reminder: You have not visited the newly created agent ${agent.name} (${agent.gxId}).`);
          await sendWhatsApp(manager.phone, `Reminder: Agent ${agent.name} awaits visit/confirmation.`);
        }
      }
      
      console.log('Finished processing agent alarms.');
    } catch (error) {
      console.error('Error in agent unvisited alarm job:', error);
    }
  });

  console.log('Cron jobs initialized successfully.');
};

module.exports = { initCronJobs };
