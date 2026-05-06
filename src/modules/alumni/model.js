const mongoose = require('mongoose');

const alumniRegistrationSchema = new mongoose.Schema({
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  graduationYear: String,
  university: String,
  degree: String,
  currentCompany: String,
  role: String,
  linkedInProfile: String,
  documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  rejectionReason: String,
}, { timestamps: true });

const studentRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alumni: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The assigned mentor
  query: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Assigned', 'Resolved'], default: 'Pending' },
}, { timestamps: true });

const serviceRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlumniService', required: true },
  serviceName: { type: String, required: true },
  description: String,
  cost: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Completed', 'Rejected'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  isCompleted: { type: Boolean, default: false },
  isFundTransferred: { type: Boolean, default: false },
  payoutId: String,
  payoutResponse: Object,
}, { timestamps: true });

const pricingCatalogSchema = new mongoose.Schema({
  serviceName: { type: String, required: true, unique: true },
  defaultCost: { type: Number, required: true },
  description: String,
}, { timestamps: true });

const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['Announcement', 'General'], default: 'General' },
}, { timestamps: true });

const alumniChatMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlumniService' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = {
  AlumniRegistration: mongoose.model('AlumniRegistration', alumniRegistrationSchema),
  StudentRequest: mongoose.model('StudentRequest', studentRequestSchema),
  ServiceRequest: mongoose.model('ServiceRequest', serviceRequestSchema),
  PricingCatalog: mongoose.model('PricingCatalog', pricingCatalogSchema),
  CommunityPost: mongoose.model('CommunityPost', communityPostSchema),
  AlumniChatMessage: mongoose.model('AlumniChatMessage', alumniChatMessageSchema)
};
