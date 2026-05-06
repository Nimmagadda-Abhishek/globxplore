const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Biometric', 'Visa Interview', 'Consultation', 'Other'],
    default: 'Consultation'
  },
  dateTime: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Done', 'Cancelled'],
    default: 'Pending'
  },
  notes: String,
  country: String,
}, {
  timestamps: true
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
