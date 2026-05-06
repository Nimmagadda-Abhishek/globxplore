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
    if (!payload.source || payload.source === '') {
      delete payload.source;
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

    if (req.user.role === 'TELECALLER') {
      lead.handledByTelecaller = req.user._id;
    }

    lead.status = status;
    lead.lastInteractionDate = new Date();
    lead.updatedBy = req.user._id;
    if (notes) lead.notes.push(notes);
    if (followUpDate) lead.followUpDate = followUpDate;

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
      // Check if student already exists to avoid duplicates
      const existingStudent = await Student.findOne({ phone: lead.phone });
      if (existingStudent) {
        return res.status(200).json({ success: true, message: 'Status updated, student record already exists', data: lead });
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
        country: qualificationDetails.country || 'Unknown', 
        gxId: studentGxId,
        userId: user._id,
        sourceAgent: lead.sourceAgent ? lead.sourceAgent._id : undefined,
        handledByTelecaller: lead.handledByTelecaller,
        pipelineStage: 'New',
        stageHistory: [{ stage: 'New', timestamp: new Date() }],
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
      const { triggerNotification } = require('../notification/service');
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
    
    // 1. New Leads (Uncontacted / Lead received status completely fresh)
    const newLeads = await Lead.find({ status: 'Lead received' }).sort({ createdAt: 1 });

    // 2. Missed Follow ups (FollowUp date is in the past)
    const missedFollowups = await Lead.find({ 
      followUpDate: { $lt: now },
      status: { $nin: ['Interested', 'Lead received'] } 
    }).sort({ followUpDate: 1 });

    // 3. Old Leads (Everything else that isn't completely disqualified)
    const oldLeads = await Lead.find({ 
      status: { $nin: ['Lead received', 'Interested', 'Not interested'] },
      followUpDate: { $gte: now } 
    }).sort({ lastInteractionDate: 1 });

    res.status(200).json({
      success: true,
      data: {
        newLeads,
        missedFollowups,
        oldLeads
      }
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
