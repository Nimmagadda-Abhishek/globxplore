const Student = require('./model');
const User = require('../user/model');
const { generateGxId } = require('../../utils/gxIdGenerator');
const crypto = require('crypto');

/**
 * Convert a Lead to a Student or create a new student entry.
 */
exports.createStudent = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    
    // 1. Generate GxID and Password
    const gxId = await generateGxId('STUDENT');
    const temporaryPassword = crypto.randomBytes(4).toString('hex'); // 8 characters

    // 2. Create User Record first
    const user = await User.create({
      gxId,
      name,
      email,
      phone,
      password: temporaryPassword,
      role: 'STUDENT',
      mustChangePassword: true,
      createdBy: req.user._id
    });

    // 3. Create Student entry linked to User
    const student = await Student.create({
      ...req.body,
      gxId,
      userId: user._id,
      assignedCounsellor: req.user.role === 'COUNSELLOR' ? req.user._id : undefined,
      stageHistory: [{ stage: 'New', timestamp: new Date() }],
    });

    res.status(201).json({ 
      success: true, 
      data: {
        student,
        credentials: {
          gxId,
          password: temporaryPassword
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move student through the pipeline stages.
 */
exports.updateStage = async (req, res, next) => {
  try {
    const { stage, notes } = req.body;
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
    
    if (notes) student.notes.push(notes);

    await student.save();

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a document to the student's profile.
 * Supports multipart/form-data via AWS Multer or direct URL.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    const { name, type, visibility } = req.body;
    const url = req.file ? req.file.location : req.body.url;
    console.log('[UploadDocument] req.body:', req.body);
    console.log('[UploadDocument] req.file:', req.file);

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Permission check for students: can only upload to their own profile
    if (req.user.role === 'STUDENT' && student.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to upload documents to this profile' });
    }

    // Map visibility "Public" to "Student" to match schema enum
    const dbVisibility = visibility === 'Public' ? 'Student' : (visibility || 'Office');

    const newDoc = { 
      name: name || (req.file ? req.file.originalname : 'Document'), 
      url, 
      type: req.file ? req.file.mimetype : 'unknown', 
      category: type || 'other', // Map request "type" to schema "category"
      visibility: dbVisibility,
      uploadedAt: new Date() 
    };

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: newDoc } },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: updatedStudent.documents[updatedStudent.documents.length - 1],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a message to the student's chat log.
 */
exports.addMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    student.messages.push({
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      content,
      timestamp: new Date()
    });

    await student.save();

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all students for the counsellor or agent.
 */
exports.getStudents = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'AGENT') {
      query.assignedAgent = req.user._id;
    }
    // Note: Counsellors per "access to work on all student profiles" can view globally without restrictions.

    const students = await Student.find(query).populate('assignedAgent', 'name gxId');
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single student by ID.
 */
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('assignedAgent', 'name gxId email phone')
      .populate('assignedCounsellor', 'name gxId email phone')
      .populate('handledByTelecaller', 'name gxId');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a payment request for a student (Counsellor/Admin).
 */
exports.addPaymentRequest = async (req, res, next) => {
  try {
    const { title, amount, dueDate, description } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.payments.push({
      title,
      amount,
      dueDate,
      description,
      status: 'pending'
    });

    await student.save();
    res.status(201).json({ success: true, message: 'Payment request added', data: student.payments });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student details.
 */
exports.updateStudent = async (req, res, next) => {
  try {
    let student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Update fields
    student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a student.
 * Accessible by: Admin only.
 */
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
};
