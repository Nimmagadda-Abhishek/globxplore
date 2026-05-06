const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  countryTarget: {
    type: String, // E.g., 'Canada', 'UK', or 'Global'
    default: 'Global',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
  }
}, { timestamps: true });

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
