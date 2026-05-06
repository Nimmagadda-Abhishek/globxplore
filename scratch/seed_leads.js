const mongoose = require('mongoose');
const path = require('path');
const Lead = require(path.join(__dirname, '..', 'src', 'modules', 'lead', 'model'));
require('dotenv').config();

async function seedLeads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const leadData = {
      gxId: 'GXLD999999',
      name: 'Test Interested Lead',
      phone: '9988776655',
      email: 'interested@lead.com',
      status: 'Interested',
      source: 'Digital Marketing'
    };

    const existingLead = await Lead.findOne({ phone: leadData.phone });
    if (existingLead) {
      console.log('Lead already exists. Updating status to Interested...');
      existingLead.status = 'Interested';
      await existingLead.save();
    } else {
      console.log('Creating new Interested Lead...');
      await Lead.create(leadData);
    }

    console.log('Lead seeded.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

seedLeads();
