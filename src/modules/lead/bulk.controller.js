const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Lead = require('./model');
const User = require('../user/model');
const { generateGxId } = require('../../utils/gxIdGenerator');

/**
 * Bulk Upload Leads from Excel/CSV
 */
exports.bulkUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    // Parse workbook from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty' });
    }

    const results = {
      total: data.length,
      success: 0,
      failures: 0,
      duplicates: 0,
      errors: []
    };

    const telecallerId = req.body.telecallerId;

    // Optional: Validate telecaller if provided
    if (telecallerId && telecallerId !== 'undefined' && telecallerId !== 'null' && telecallerId !== '') {
      const rawStr = String(telecallerId).trim();
      let extractedEmail = null;
      const emailMatch = rawStr.match(/\(([^)]+)\)/) || rawStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        extractedEmail = emailMatch[1].trim().toLowerCase();
      }

      const isObjectId = mongoose.Types.ObjectId.isValid(rawStr);
      const orConditions = [];

      if (isObjectId) {
        orConditions.push({ _id: rawStr });
      }
      orConditions.push({ gxId: rawStr.toUpperCase() });
      orConditions.push({ email: rawStr.toLowerCase() });
      orConditions.push({ name: new RegExp(`^${rawStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

      if (extractedEmail) {
        orConditions.push({ email: extractedEmail });
      }

      // First attempt: search specifically for TELECALLER role
      let telecaller = await User.findOne({
        role: 'TELECALLER',
        $or: orConditions
      });

      // Second attempt: search across any user if role filter was too strict
      if (!telecaller) {
        telecaller = await User.findOne({ $or: orConditions });
      }

      if (!telecaller) {
        return res.status(404).json({ success: false, message: 'Assigned Telecaller not found' });
      }
      // Store the real ObjectId for lead assignment below
      req.validatedTelecallerId = telecaller._id;
    }

    const assignedTelecallerId = req.validatedTelecallerId || undefined;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Map common column names
      const name = row.name || row.Name || row['Full Name'] || row['Student Name'];
      const phone = row.phone || row.Phone || row['Contact Number'] || row['Mobile'] || row['Mobile Number'];
      const email = row.email || row.Email;
      const source = row.source || row.Source || 'Paper Leads';

      if (!name || !phone) {
        results.failures++;
        results.errors.push(`Row ${i + 2}: Missing Name or Phone.`);
        continue;
      }

      const phoneStr = phone.toString().trim();

      // Check for duplicate phone in DB
      const existing = await Lead.findOne({ phone: phoneStr });
      if (existing) {
        results.duplicates++;
        continue;
      }

      try {
        const gxId = await generateGxId('LEAD');
        await Lead.create({
          gxId,
          name: name.toString().trim(),
          phone: phoneStr,
          email: email ? email.toString().toLowerCase().trim() : undefined,
          source: source,
          assignedTo: assignedTelecallerId,
          handledByTelecaller: assignedTelecallerId,
          status: 'Lead received'
        });
        results.success++;
      } catch (err) {
        results.failures++;
        results.errors.push(`Row ${i + 2} (${name}): ${err.message}`);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Bulk upload completed',
      data: results 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Assign Leads to a Telecaller
 */
exports.bulkAssign = async (req, res, next) => {
  try {
    const { leadIds, telecallerId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of leadIds' });
    }

    if (!telecallerId) {
      return res.status(400).json({ success: false, message: 'Please provide a telecallerId' });
    }

    const rawStr = String(telecallerId).trim();
    let extractedEmail = null;
    const emailMatch = rawStr.match(/\(([^)]+)\)/) || rawStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      extractedEmail = emailMatch[1].trim().toLowerCase();
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(rawStr);
    const orConditions = [];

    if (isObjectId) {
      orConditions.push({ _id: rawStr });
    }
    orConditions.push({ gxId: rawStr.toUpperCase() });
    orConditions.push({ email: rawStr.toLowerCase() });
    orConditions.push({ name: new RegExp(`^${rawStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

    if (extractedEmail) {
      orConditions.push({ email: extractedEmail });
    }

    let telecaller = await User.findOne({
      role: 'TELECALLER',
      $or: orConditions
    });

    if (!telecaller) {
      telecaller = await User.findOne({ $or: orConditions });
    }

    if (!telecaller) {
      return res.status(404).json({ success: false, message: 'Telecaller not found' });
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedTo: telecaller._id, handledByTelecaller: telecaller._id } }
    );

    res.status(200).json({ 
      success: true, 
      message: `${result.modifiedCount} leads assigned successfully to ${telecaller.name}`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    next(error);
  }
};
