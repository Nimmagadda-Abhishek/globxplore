const express = require('express');
const router = express.Router();
const alumniController = require('./alumni_manager.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

// Public routes
router.post('/login', alumniController.login);

// Protected routes
router.use(protect);
router.use(authorize('ALUMNI_MANAGER', 'ADMIN'));

router.get('/me', alumniController.getMe);
router.post('/logout', alumniController.logout);

// 2. Dashboard APIs
router.get('/dashboard/summary', alumniController.getDashboardSummary);
router.get('/dashboard/activity', alumniController.getDashboardActivity);

// 3. Alumni Registration & Approval
router.get('/registrations', alumniController.getRegistrations);
router.get('/registrations/:id', alumniController.getRegistrationById);
router.patch('/registrations/:id/approve', alumniController.approveRegistration);
router.patch('/registrations/:id/reject', alumniController.rejectRegistration);

router.get('/pending-alumni', alumniController.getPendingAlumni);
router.patch('/approve-alumni/:id', alumniController.approveAlumniAccount);

// 4. Users APIs
router.get('/users', alumniController.getUsers);
router.patch('/users/:id/status', alumniController.updateUserStatus);

// 5. Student Connect APIs
router.get('/student-requests', alumniController.getStudentRequests);
router.patch('/student-requests/:id/assign', alumniController.assignMentor);
router.patch('/student-requests/:id/resolve', alumniController.resolveRequest);

// 6. Alumni Service Approval APIs
router.get('/services', alumniController.getAllAlumniServices);
router.get('/services/pending', alumniController.getPendingAlumniServices);
router.patch('/services/:id/approve-alumni-service', alumniController.approveAlumniService);
router.patch('/services/:id/reject-alumni-service', alumniController.rejectAlumniService);

// 7. Service Request APIs
router.get('/services/requests', alumniController.getServiceRequests);
router.patch('/services/requests/:id/approve', alumniController.approveService);
router.patch('/services/requests/:id/reject', alumniController.rejectService);
router.patch('/services/requests/:id/cost', alumniController.modifyCost);

// 8. Pricing APIs
router.get('/pricing', alumniController.getPricing);
router.put('/pricing', alumniController.updatePricing);

// 9. Payment APIs
router.get('/payments', alumniController.getPayments);
router.get('/payments/summary', alumniController.getPaymentSummary);

// 10. Community APIs
router.post('/community/announcement', alumniController.createAnnouncement);
router.get('/community/posts', alumniController.getCommunityFeed);

// 11. Reports APIs
router.get('/reports/export', alumniController.exportReports);

// --- 7. Payout APIs ---
router.get('/payouts', alumniController.getPayoutRequests);
router.patch('/payouts/:id/transfer', alumniController.transferFunds);

module.exports = router;
