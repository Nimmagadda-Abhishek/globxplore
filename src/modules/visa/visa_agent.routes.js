const express = require('express');
const router = express.Router();
const visaAgentController = require('./visa_agent.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');
const upload = require('../../middleware/upload');

// Public routes
router.post('/login', visaAgentController.login);

// Protected routes
router.use(protect);
router.use(authorize('VISA_AGENT', 'ADMIN'));

router.post('/logout', visaAgentController.logout);
router.get('/me', visaAgentController.getMe);

// Dashboard APIs
router.get('/dashboard/summary', visaAgentController.getDashboardSummary);
router.get('/dashboard/urgent', visaAgentController.getDashboardUrgent);
router.get('/analytics', visaAgentController.getAnalytics);

// Client Creation APIs
router.post('/clients', visaAgentController.createClient);
router.get('/clients', visaAgentController.getClients);
router.get('/clients/:id', visaAgentController.getClientById);
router.put('/clients/:id', visaAgentController.updateClient);

// Filter APIs
router.get('/clients/by-country/:country', visaAgentController.getClientsByCountry);
router.get('/clients/by-visa/:type', visaAgentController.getClientsByVisa);

// DS-160 APIs
router.post('/clients/:id/ds160/create', visaAgentController.createDS160);
router.patch('/clients/:id/ds160/status', visaAgentController.updateDS160Status);
router.post('/clients/:id/ds160/pdf', upload.single('file'), visaAgentController.uploadDS160Pdf);
router.get('/clients/:id/ds160', visaAgentController.getDS160);

// Portal Credential APIs
router.post('/clients/:id/portal/create', visaAgentController.createPortal);
router.get('/clients/:id/portal', visaAgentController.getPortal);

// Payment APIs (Razorpay)
router.get('/payment/plans', visaAgentController.getPaymentPlans);
router.post('/clients/:id/payment/order', visaAgentController.createPaymentOrder);
router.post('/clients/:id/payment/verify', visaAgentController.verifyPayment);
router.post('/clients/:id/payment/link', visaAgentController.generatePaymentLink); 
router.get('/clients/:id/payment/link/:plId/sync', visaAgentController.syncPaymentLinkStatus);
router.patch('/clients/:id/mark-done', visaAgentController.markAsDone);
router.get('/clients/:id/payments', visaAgentController.getPayments);

// Appointment APIs
router.patch('/clients/:id/appointment/monitoring', visaAgentController.updateAppointmentMonitoring);
router.patch('/clients/:id/appointment/booked', visaAgentController.bookAppointment);
router.patch('/clients/:id/appointment/reschedule', visaAgentController.rescheduleAppointment);
router.patch('/clients/:id/slot-confirmation', visaAgentController.slotConfirmation);
router.post('/clients/:id/confirmation-page', upload.single('file'), visaAgentController.uploadConfirmationPage);

// Screening APIs
router.patch('/clients/:id/biometric-screening', visaAgentController.updateBiometricScreening);
router.patch('/clients/:id/interview-screening', visaAgentController.updateInterviewScreening);

// Final Decision APIs
router.patch('/clients/:id/result', visaAgentController.updateResult);
router.post('/clients/:id/message', visaAgentController.addMessage);

// Reminder APIs
router.get('/reminders', (req, res) => res.json({ success: true, data: [] })); // Placeholder for reminder service
router.get('/notifications', (req, res) => res.json({ success: true, data: [] }));

module.exports = router;
