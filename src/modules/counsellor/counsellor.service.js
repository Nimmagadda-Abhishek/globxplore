const Lead = require('../lead/model');
const Student = require('../student/model');
const User = require('../user/model');
const KTDoc = require('./kt_doc.model');
const Webinar = require('../webinar/model');
const StudentRequest = require('./student_request.model');
const { generateGxId } = require('../../utils/gxIdGenerator');

/**
 * Claim an interested lead and convert to student.
 */
exports.claimLead = async (leadId, counsellorId) => {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('Lead not found');
  if (lead.status !== 'Interested') throw new Error('Only interested leads can be claimed');

  // Check if already converted
  let student = await Student.findOne({ phone: lead.phone });
  if (student) {
    if (student.assignedCounsellor) throw new Error('Lead already assigned to a counsellor');
    student.assignedCounsellor = counsellorId;
    await student.save();
    return student;
  }

  // Create new student
  const gxId = await generateGxId('STUDENT');
  student = await Student.create({
    gxId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    assignedCounsellor: counsellorId,
    handledByTelecaller: lead.handledByTelecaller,
    pipelineStage: 'new_lead',
    stageHistory: [{ stage: 'new_lead', comment: 'Lead claimed by counsellor' }]
  });

  // Mark lead as handled or update status if needed
  lead.assignedTo = counsellorId;
  await lead.save();

  return student;
};

/**
 * Update student pipeline stage.
 */
exports.updateStage = async (studentId, stage, comment, userId) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error('Student not found');

  const oldStage = student.pipelineStage;
  if (oldStage === stage) return student;

  // Calculate duration in previous stage
  const lastHistory = student.stageHistory[student.stageHistory.length - 1];
  let durationMs = 0;
  if (lastHistory) {
    durationMs = Date.now() - new Date(lastHistory.timestamp).getTime();
    lastHistory.durationMs = durationMs;
  }

  student.pipelineStage = stage;
  student.stageHistory.push({
    stage,
    comment,
    changedBy: userId,
    timestamp: new Date()
  });

  await student.save();
  
  // Send WhatsApp update to student
  try {
    const notificationService = require('../notification/service');
    await notificationService.triggerNotification({
      userId: student.userId,
      eventKey: 'APPLICATION_STAGE_CHANGED',
      data: {
        name: student.name,
        stage: stage
      },
      channels: ['app', 'whatsapp', 'email']
    });
  } catch (err) {
    console.error('Failed to send stage update notification:', err.message);
  }
  
  return student;
};

/**
 * Dashboard Summary logic
 */
exports.getSummary = async (counsellorId) => {
  const [assignedLeads, activeStudents, offersReceived, visaApproved] = await Promise.all([
    Lead.countDocuments({ assignedTo: counsellorId }),
    Student.countDocuments({ assignedCounsellor: counsellorId, pipelineStage: { $nin: ['departure_date', 'college_enrollment', 'alumni_tracking'] } }),
    Student.countDocuments({ assignedCounsellor: counsellorId, pipelineStage: 'offer_received' }),
    Student.countDocuments({ assignedCounsellor: counsellorId, pipelineStage: 'visa_approved' })
  ]);

  return {
    assignedLeads,
    activeStudents,
    offersReceived,
    visaApproved,
    pendingFollowUps: 0, // Logic for followups needed
    conversionRate: 0,
    avgResponseTime: 0
  };
};
