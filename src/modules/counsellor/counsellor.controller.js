const Student = require('../student/model');
const Lead = require('../lead/model');
const User = require('../user/model');
const { ActivityLog } = require('../activity/model');
const Webinar = require('../webinar/model');
const KTDoc = require('./kt_doc.model');
const mongoose = require('mongoose');

/**
 * Get dashboard statistics for the logged-in counsellor.
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const counsellorId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. KPI Stats
    const assignedLeadsCount = await Lead.countDocuments({});
    const activeStudentsCount = await Student.countDocuments({
      pipelineStage: { $nin: ['visa_approved', 'departure_date', 'college_enrollment', 'alumni_tracking'] }
    });
    const followUpsCount = await Lead.countDocuments({ 
      followUpDate: { $gte: today, $lt: tomorrow } 
    });
    const offersReceivedCount = await Student.countDocuments({
      pipelineStage: 'offer_received'
    });
    const visaApprovedCount = await Student.countDocuments({
      pipelineStage: 'visa_approved'
    });

    // 2. Conversion Rate (Visa Approved / Total Students)
    const totalStudents = await Student.countDocuments({ assignedCounsellor: counsellorId });
    const conversionRate = totalStudents > 0 ? ((visaApprovedCount / totalStudents) * 100).toFixed(1) : 0;

    // 3. Today's Follow-ups (Real list)
    const todayFollowUps = await Lead.find({
      assignedTo: counsellorId,
      followUpDate: { $gte: today, $lt: tomorrow }
    }).select('name status followUpDate').limit(5);

    // 4. Recent Activity (Real logs)
    const recentActivity = await ActivityLog.find({ userId: counsellorId })
      .sort({ timestamp: -1 })
      .limit(5);

    // 5. Upcoming Webinars
    const upcomingWebinars = await Webinar.find({ 
      scheduledFor: { $gte: new Date() } 
    }).sort({ scheduledFor: 1 }).limit(3);

    // 6. KT Docs
    const ktDocs = await KTDoc.find({ isActive: true }).limit(6);

    // 7. Recent Chats (Extracting last messages from assigned students)
    const studentsWithMessages = await Student.find({
      'messages.0': { $exists: true }
    })
    .select('name gxId messages')
    .slice('messages', -1) // Get only the last message
    .sort({ 'messages.timestamp': -1 })
    .limit(5);

    const recentChats = studentsWithMessages.map(s => ({
      studentId: s._id,
      name: s.name,
      gxId: s.gxId,
      lastMessage: s.messages[0]?.content,
      timestamp: s.messages[0]?.timestamp,
      unread: false
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          assignedLeads: assignedLeadsCount,
          activeStudents: activeStudentsCount,
          followUpsToday: followUpsCount,
          offersReceived: offersReceivedCount,
          visaApproved: visaApprovedCount,
          conversionRate: `${conversionRate}%`
        },
        todayFollowUps,
        recentActivity,
        upcomingWebinars,
        ktDocs,
        recentChats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get urgent actions (students with pending actions color-coded).
 */
exports.getUrgentActions = async (req, res, next) => {
  try {
    const counsellorId = req.user._id;
    const now = new Date();

    const students = await Student.find({})
      .select('name pipelineStage updatedAt')
      .sort({ updatedAt: 1 })
      .limit(10);

    const urgentActions = students.map(s => {
      const diffDays = Math.floor((now - s.updatedAt) / (1000 * 60 * 60 * 24));
      let status = 'green';
      if (diffDays >= 10) status = 'alert';
      else if (diffDays >= 7) status = 'red';
      else if (diffDays >= 3) status = 'orange';

      return {
        _id: s._id,
        name: s.name,
        stage: s.pipelineStage,
        pendingDays: diffDays,
        status
      };
    });

    res.status(200).json({ success: true, data: urgentActions });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pipeline distribution for Kanban.
 */
exports.getPipeline = async (req, res, next) => {
  try {
    const counsellorId = req.user._id;

    const pipeline = await Student.aggregate([
      { $group: { _id: '$pipelineStage', count: { $sum: 1 }, students: { $push: { name: '$name', gxId: '$gxId', country: '$country', updatedAt: '$updatedAt' } } } }
    ]);

    res.status(200).json({ success: true, data: pipeline });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my students table data.
 */
exports.getMyStudents = async (req, res, next) => {
  try {
    const counsellorId = req.user._id;
    const { page = 1, limit = 10, search, stage, country } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gxId: { $regex: search, $options: 'i' } }
      ];
    }
    if (stage) query.pipelineStage = stage;
    if (country) query.country = country;

    const students = await Student.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 });

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
