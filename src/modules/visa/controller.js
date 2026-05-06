const VisaProcess = require('./model');

/**
 * Initialize a generic Visa Application (For Students or standalone Clients)
 */
exports.createVisaProcess = async (req, res, next) => {
  try {
    const visa = await VisaProcess.create({
      ...req.body,
      assignedAgent: req.user.role === 'VISA_AGENT' ? req.user._id : undefined
    });

    res.status(201).json({ success: true, data: visa });
  } catch (error) {
    next(error);
  }
};

/**
 * Update visa application details (Status, Notes, Creds).
 */
exports.updateVisaStatus = async (req, res, next) => {
  try {
    const updates = req.body;
    
    // Explicitly prevent clients from mutating statuses
    if (req.user.role === 'VISA_CLIENT') {
       return res.status(403).json({ success: false, message: 'Clients cannot mutate status' });
    }

    const visa = await VisaProcess.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!visa) return res.status(404).json({ success: false, message: 'Visa process not found' });

    res.status(200).json({ success: true, data: visa });
  } catch (error) {
    next(error);
  }
};

/**
 * Dashboard specific for Visa Agents categorizing globally by Country -> VisaType
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const pipeline = await VisaProcess.aggregate([
      { $match: { assignedAgent: req.user._id } },
      {
        $group: {
          _id: { country: "$country", visaType: "$visaType" },
          clients: { $push: "$$ROOT" }
        }
      },
      {
        $group: {
          _id: "$_id.country",
          categories: {
            $push: {
              type: "$_id.visaType",
              clients: "$clients"
            }
          }
        }
      }
    ]);
    
    res.status(200).json({ success: true, data: pipeline });
  } catch (error) {
    next(error);
  }
};

/**
 * Client fetching specific visa details.
 */
exports.getVisaDetails = async (req, res, next) => {
  try {
    // Determine target based on param or auth
    const targetId = req.params.userId || req.user._id;
    const visas = await VisaProcess.find({ linkedUser: targetId });
    
    res.status(200).json({ success: true, data: visas });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Mandatory Document directly targeting the 10-doc biometric array.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    const { name } = req.body;
    const url = req.file ? req.file.location : req.body.url;
    const visa = await VisaProcess.findById(req.params.id);

    if (!visa) return res.status(404).json({ success: false, message: 'Visa not found' });

    // Client restriction enforcement to exact list limits
    if (visa.mandatoryDocs.length >= 10) {
       return res.status(400).json({ success: false, message: 'Maximum 10 mandatory documents uploaded' });
    }

    visa.mandatoryDocs.push({ name, url, uploadedAt: new Date() });
    await visa.save();

    res.status(200).json({ success: true, data: visa });
  } catch (error) {
    next(error);
  }
};
