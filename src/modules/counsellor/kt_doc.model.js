const mongoose = require('mongoose');

const ktDocSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  visibility: {
    type: String,
    enum: ['student', 'office', 'both'],
    default: 'office',
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isArchived: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('KTDoc', ktDocSchema);
