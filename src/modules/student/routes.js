const express = require('express');
const router = express.Router();
const staffController = require('./controller');
const studentPortalController = require('./student.controller');
const { protect } = require('../../middleware/auth');
const { authorize, requireConfirmedAgent } = require('../../middleware/role');
const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { documentSchema } = require('./validation');

// --- STUDENT PORTAL ROUTES (Student Facing) ---
router.post('/register', studentPortalController.register);


// Protected Student Routes
router.get('/me', protect, authorize('STUDENT'), studentPortalController.getMe);
router.get('/dashboard', protect, authorize('STUDENT'), studentPortalController.getDashboard);
router.get('/pipeline', protect, authorize('STUDENT'), studentPortalController.getPipeline);
router.get('/alerts', protect, authorize('STUDENT'), studentPortalController.getAlerts);
router.put('/profile', protect, authorize('STUDENT'), studentPortalController.updateProfile);
router.get('/documents', protect, authorize('STUDENT'), studentPortalController.getDocuments);
router.post('/documents', protect, authorize('STUDENT'), upload.single('file'), studentPortalController.uploadDocument);
router.get('/payments', protect, authorize('STUDENT'), studentPortalController.getPayments);
router.post('/payment/:paymentId/pay', protect, authorize('STUDENT'), studentPortalController.initiateFeePayment);

// Subscriptions
router.get('/subscriptions/plans', protect, authorize('STUDENT'), studentPortalController.getPlans);
router.post('/subscription/order', protect, authorize('STUDENT'), studentPortalController.createOrder);
router.post('/subscription/verify', protect, authorize('STUDENT'), studentPortalController.verifyPayment);


// --- STAFF MANAGEMENT ROUTES (Admin/Counsellor Facing) ---
router.post('/', protect, authorize('ADMIN', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR', 'TELECALLER'), requireConfirmedAgent, staffController.createStudent);
router.get('/', protect, authorize('ADMIN', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), staffController.getStudents);
router.get('/:id', protect, authorize('ADMIN', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), staffController.getStudentById);
router.put('/:id', protect, authorize('COUNSELLOR'), requireConfirmedAgent, staffController.updateStudent);
router.patch('/:id/stage', protect, authorize('ADMIN', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR'), requireConfirmedAgent, staffController.updateStage);
router.post('/:id/document', protect, authorize('ADMIN', 'AGENT_MANAGER', 'AGENT', 'COUNSELLOR', 'VISA_AGENT', 'STUDENT'), requireConfirmedAgent, upload.single('file'), validate(documentSchema), staffController.uploadDocument);
router.post('/:id/payment', protect, authorize('ADMIN', 'COUNSELLOR'), requireConfirmedAgent, staffController.addPaymentRequest);
router.post('/:id/message', protect, authorize('ADMIN', 'AGENT_MANAGER', 'COUNSELLOR', 'VISA_AGENT', 'STUDENT'), requireConfirmedAgent, staffController.addMessage);
router.delete('/:id', protect, authorize('ADMIN'), staffController.deleteStudent);


module.exports = router;
