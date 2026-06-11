const Lead = require('./model');
const Student = require('../student/model');
const User = require('../user/model');
const { generateGxId } = require('../../utils/gxIdGenerator');
const { sendEmail, sendWhatsApp } = require('../notification/service');
const crypto = require('crypto');

/**
 * Create a new lead.
 * Accessible by: Admin, Telecaller, Agent Manager, Agent.
 */
exports.createLead = async (req, res, next) => {
  try {
    const gxId = await generateGxId('LEAD');

    // Auto-detect source agent if creator is an Agent
    const sourceAgent = req.user.role === 'AGENT' ? req.user._id : undefined;

    // Sanitize payload to allow DB defaults to trigger if frontend sends empty strings
    const payload = { ...req.body };

    // Normalize frontend keys to Lead schema keys.
    // Frontend (UI) sends:
    // - country -> interestCountry
    // - interest -> interestedLevel
    // - course -> course
    if ((!payload.interestCountry || payload.interestCountry === '') && payload.country) {
      payload.interestCountry = payload.country;
    }
    if ((!payload.interestedLevel || payload.interestedLevel === '') && payload.interest) {
      payload.interestedLevel = payload.interest;
    }

    // Backward compatible misspellings mapping (if frontend used older keys)
    if ((!payload.interestCountry || payload.interestCountry === '') && payload.intrestCountry) {
      payload.interestCountry = payload.intrestCountry;
    }
    if ((!payload.course || payload.course === '') && payload.intrestCourse) {
      payload.course = payload.intrestCourse;
    }
    if ((!payload.interestedLevel || payload.interestedLevel === '') && payload.intrestedLevel) {
      payload.interestedLevel = payload.intrestedLevel;
    }

    if (!payload.source || payload.source === '') {
      delete payload.source;
    }

    if (!payload.email || payload.email.trim() === '') {
      delete payload.email;
    }

    // Check for existing lead or student with same phone
    if (payload.phone) {
      const existingLeadPhone = await Lead.findOne({ phone: payload.phone });
      if (existingLeadPhone) {
        return res.status(400).json({ success: false, message: 'A lead with this phone number already exists.' });
      }
      const existingStudentPhone = await Student.findOne({ phone: payload.phone });
      if (existingStudentPhone) {
        return res.status(400).json({ success: false, message: 'A student with this phone number already exists.' });
      }
    }

    // Check for existing lead or student with same email
    if (payload.email) {
      const searchEmail = payload.email.toLowerCase();
      const existingLeadEmail = await Lead.findOne({ email: searchEmail });
      if (existingLeadEmail) {
        return res.status(400).json({ success: false, message: 'A lead with this email already exists.' });
      }
      const existingStudentEmail = await Student.findOne({ email: searchEmail });
      if (existingStudentEmail) {
        return res.status(400).json({ success: false, message: 'A student with this email already exists.' });
      }
    }

    const lead = await Lead.create({
      ...payload,
      gxId,
      assignedTo: payload.assignedTo || req.user._id, // Default to creator unless manually assigned
      sourceAgent,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lead status and log call details.
 */
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const { status, notes, followUpDate, ...qualificationDetails } = req.body;
    const lead = await Lead.findById(req.params.id).populate('sourceAgent');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Secure lead editing:
    // - Telecaller can only edit leads assigned to them.
    // - Telecaller can only update call-related fields (status/notes/followUpDate).
    if (req.user.role === 'TELECALLER') {
      // Ownership check
      if (!lead.assignedTo || lead.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit leads assigned to you',
        });
      }

      // Field scope check (prevents updating other arbitrary lead data)
      // TELECALLER is allowed to update:
      // - identity/contact: name, email, phone
      // - status pipeline: status
      // - telecall notes + follow-up: notes, followUpDate
      // - promotion-related info captured at time of interest/qualification
      //   (some of these are not stored on Lead model, but may be sent by frontend)
      const allowedTelecallerFields = new Set([
        'name',
        'email',
        'phone',
        'status',
        'notes',
        'followUpDate',
        // interest fields
        'interestCountry',
        'course',
        'interestedLevel',
        // frontend legacy keys / aliases
        'country',
        'intrestCountry',
        'intrestedLevel',
        'intrestCourse',
        'intake',

      ]);

      const incomingKeys = Object.keys(req.body || {});
      const disallowed = incomingKeys.filter((k) => !allowedTelecallerFields.has(k));
      if (disallowed.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid fields for telecaller update: ${disallowed.join(', ')}`,
        });
      }


      lead.handledByTelecaller = req.user._id;
    }

    // Telecaller updates may include contact/name changes; apply only permitted keys (validated above).
    if (req.user.role === 'TELECALLER') {
      if (req.body.name) lead.name = req.body.name;
      if (req.body.email) lead.email = req.body.email;
      if (req.body.phone) lead.phone = req.body.phone;
    }

    lead.status = status;
    lead.lastInteractionDate = new Date();
    lead.updatedBy = req.user._id;

    if (notes) {
      if (Array.isArray(notes)) {
        if (notes.length > 0) lead.notes.push(...notes);
      } else {
        lead.notes.push(notes);
      }
    }

    if (followUpDate && followUpDate !== '-') {
      lead.followUpDate = followUpDate;
    }


    await lead.save();


    // Trigger immediate alert for 'Call not reachable'
    if (status === 'Call not reachable' && lead.sourceAgent) {
      const msg = `Lead ${lead.name} (${lead.phone}) is currently not reachable.`;
      sendEmail(lead.sourceAgent.email, 'Lead Unreachable Alert', msg).catch(console.error);
      sendWhatsApp(lead.sourceAgent.phone, msg).catch(console.error);
    }

    // Convert Lead to Student securely automatically immediately on "Interested", "Qualified", or "Ready to Apply"
    const promotionStatuses = ['Interested', 'Qualified', 'Ready to Apply'];
    if (promotionStatuses.includes(status)) {
      const existingStudent = await Student.findOne({ phone: lead.phone });
      if (existingStudent) {
        // Merge notes and remove the duplicate lead
        if (lead.notes && lead.notes.length > 0) {
          existingStudent.notes.push(...lead.notes);
          await existingStudent.save();
        }
        await Lead.findByIdAndDelete(lead._id);

        return res.status(200).json({ 
          success: true, 
          message: 'Lead merged into existing student', 
          data: { 
            lead: { ...lead.toObject(), status: 'Moved to Student' }, 
            student: existingStudent,
            credentials: {
              gxId: existingStudent.gxId,
              password: '(Already Set)'
            }
          } 
        });
      }

      const studentGxId = await generateGxId('STUDENT');
      const temporaryPassword = crypto.randomBytes(4).toString('hex');

      // Create User Record
      const user = await User.create({
        gxId: studentGxId,
        name: lead.name,
        email: lead.email || `placeholder_${Date.now()}@temp.com`,
        phone: lead.phone,
        password: temporaryPassword,
        role: 'STUDENT',
        mustChangePassword: true,
        createdBy: req.user._id
      });

      const studentData = {
        name: lead.name,
        email: lead.email || user.email,
        phone: lead.phone,
        interestedCountry: qualificationDetails.country || qualificationDetails.interestCountry || 'Unknown', 
        interestedProgram: qualificationDetails.course,
        gxId: studentGxId,
        userId: user._id,
        sourceAgent: lead.sourceAgent ? lead.sourceAgent._id : undefined,
        assignedAgent: lead.sourceAgent ? lead.sourceAgent._id : undefined,
        handledByTelecaller: lead.handledByTelecaller,
        pipelineStage: status,
        stageHistory: [{ stage: status, timestamp: new Date() }],
        educationBackground: qualificationDetails.educationBackground,
        percentage: qualificationDetails.percentage,
        passingYear: qualificationDetails.passingYear,
        ieltsStatus: qualificationDetails.ieltsStatus,
        budgetRange: qualificationDetails.budgetRange,
        passportStatus: qualificationDetails.passportStatus,
        passportNumber: qualificationDetails.passportNumber,
        intake: qualificationDetails.intake,
        alternateContact: qualificationDetails.alternateContact
      };
      
      const newStudent = await Student.create(studentData);

      // Remove the lead record as it is now moved to students
      await Lead.findByIdAndDelete(lead._id);

      // Notify source agent if exists
      if (lead.sourceAgent) {
        const msg = `Good news! Your lead ${lead.name} has been promoted to a student (ID: ${studentGxId}).`;
        sendWhatsApp(lead.sourceAgent.phone, msg).catch(console.error);
      }

      // Notify the student with their new credentials
      const { triggerNotification, sendWelcomeEmail } = require('../notification/service');

      // Queue templated app/email/whatsapp notification
      triggerNotification({
        userId: user._id,
        eventKey: 'PROMOTION_SUCCESS',
        data: {
          name: lead.name,
          gxId: studentGxId,
          password: temporaryPassword
        },
        channels: ['app', 'email', 'whatsapp']
      }).catch(console.error);

      // Also send explicit welcome credentials email
      // (non-blocking; do not fail promotion if email fails)
      try {
        await sendWelcomeEmail({
          email: user.email,
          name: user.name,
          gxId: studentGxId,
          password: temporaryPassword,
          role: user.role,
        });
      } catch (e) {
        console.error('Failed to send welcome email on promotion:', e.message);
      }


      return res.status(200).json({ 
        success: true, 
        message: 'Promoted to student successfully and lead record removed', 
        data: { 
          lead: { ...lead.toObject(), status: 'Moved to Student' }, 
          student: newStudent,
          credentials: {
            gxId: studentGxId,
            password: temporaryPassword
          }
        } 
      });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all leads with role-based filtering.
 */
exports.getLeads = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'AGENT' || req.user.role === 'AGENT_MANAGER') {
      query.$or = [
        { assignedTo: req.user._id },
        { sourceAgent: req.user._id }
      ];
    }
    // ADMIN, TELECALLER, and COUNSELLOR see all leads by default in this global list

    const leads = await Lead.find(query)
      .populate('sourceAgent', 'name gxId')
      .populate('assignedTo', 'name gxId')
      .populate('updatedBy', 'name gxId')
      .sort({ createdAt: -1 });


    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all leads assigned to the current user.
 */
exports.getMyLeads = async (req, res, next) => {
  try {
    const leads = await Lead.find({ assignedTo: req.user._id }).populate('sourceAgent', 'name gxId');
    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sorted lead queue for Telecallers.
 * Ordering: New Leads -> Missed Follow-ups -> Old Leads
 */
exports.getTelecallerQueue = async (req, res, next) => {
  try {
    const now = new Date();
    const CALL_NOT_ANSWERED = 'Call not answered';

    // Today boundaries in server local timezone
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. New Leads (Uncontacted / Lead received status completely fresh)
    const newLeads = await Lead.find({ status: 'Lead received' }).sort({ createdAt: 1 });

    // 2. Missed Follow ups (overdue / due-today queue)
    // - Explicitly include "Call not answered" in missedFollowups
    // - Also include other non-terminal followups based on date
    const missedFollowups = await Lead.find({
      $or: [
        { status: CALL_NOT_ANSWERED },
        {
          followUpDate: { $lt: endOfToday },
          status: { $nin: ['Interested', 'Lead received', CALL_NOT_ANSWERED] },
        },
      ],
    }).sort({ followUpDate: 1 });

    // 3. Old Leads (upcoming)
    // Must NOT filter out "Call not answered"; keep it eligible.
    const oldLeads = await Lead.find({
      status: { $nin: ['Lead received', 'Interested', 'Not interested'] },
      followUpDate: { $gte: startOfToday },
    }).sort({ lastInteractionDate: 1 });

    res.status(200).json({
      success: true,
      data: {
        newLeads,
        missedFollowups,
        oldLeads,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all 'Interested' leads specifically for Counsellors to pull from Telecaller pipelines.
 */
exports.getInterestedLeads = async (req, res, next) => {
  try {
    const leads = await Lead.find({ status: 'Interested' }).sort({ lastInteractionDate: -1 });
    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single Lead by ID.
 * Accessible by: Admin, Telecaller, Agent Manager, Agent.
 */
exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name')
      .populate('sourceAgent', 'name')
      .populate('handledByTelecaller', 'name')
      .populate('updatedBy', 'name');


    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lead.
 * Accessible by: Admin only.
 */
exports.deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    next(error);
  }
};
