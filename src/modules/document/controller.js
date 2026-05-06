const Document = require('./model');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { studentId, type, name } = req.body;
    const document = await Document.create({
      student: studentId,
      name: name || req.file.originalname,
      type,
      url: req.file.path || req.file.location,
      uploadedBy: req.user.id
    });
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const { studentId } = req.query;
    const query = studentId ? { student: studentId } : {};
    const documents = await Document.find(query).populate('student', 'name email');
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

exports.updateDocumentStatus = async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    const document = await Document.findByIdAndUpdate(req.params.id, {
      status,
      comments,
      reviewedBy: req.user.id
    }, { new: true });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};
