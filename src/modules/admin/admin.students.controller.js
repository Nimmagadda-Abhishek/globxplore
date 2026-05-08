const Student = require('../student/model');
const notificationService = require('../notification/service');

/**
 * List all students with filters.
 */
exports.getStudents = async (req, res, next) => {
  try {
    const { country, stage, page = 1, limit = 20 } = req.query;
    const query = {};

    if (country) query.country = country;
    if (stage) query.pipelineStage = stage;

    const students = await Student.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedCounsellor', 'name gxId')
      .populate('assignedAgent', 'name gxId')
      .sort({ createdAt: -1 });

    const count = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        students,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalStudents: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student profile.
 */
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('assignedCounsellor', 'name gxId')
      .populate('assignedAgent', 'name gxId')
      .populate('sourceAgent', 'name gxId')
      .populate('handledByTelecaller', 'name gxId');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move student to another stage.
 */
exports.updateStudentStage = async (req, res, next) => {
  try {
    const { stage } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Calculate duration of the last stage
    if (student.stageHistory.length > 0) {
      const lastStage = student.stageHistory[student.stageHistory.length - 1];
      const now = new Date();
      lastStage.durationMs = now.getTime() - lastStage.timestamp.getTime();
    }

    student.pipelineStage = stage;
    student.stageHistory.push({ stage, timestamp: new Date(), durationMs: 0 });
    
    await student.save();

    // Trigger WhatsApp notification for stage update
    try {
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

    res.status(200).json({
      success: true,
      message: 'Student stage updated successfully',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get grouped Kanban data.
 */
exports.getStudentPipeline = async (req, res, next) => {
  try {
    const pipeline = await Student.aggregate([
      { $group: { _id: '$pipelineStage', students: { $push: '$$ROOT' } } }
    ]);

    res.status(200).json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Intake stats.
 */
exports.getIntakeStats = async (req, res, next) => {
  try {
    const stats = await Student.aggregate([
      { $group: { _id: '$intake', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
