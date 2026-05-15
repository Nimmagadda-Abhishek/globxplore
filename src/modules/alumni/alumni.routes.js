const express = require('express');
const router = express.Router();
const alumniController = require('./alumni.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

// Public routes

router.post('/register', alumniController.register);
router.get('/services/public', protect, authorize('STUDENT', 'ADMIN'), alumniController.getAllPublicServices);
router.post('/services/:id/book', protect, authorize('STUDENT'), alumniController.bookService);
router.post('/services/payment/initiate', protect, authorize('STUDENT'), alumniController.initiateServicePayment);
router.post('/services/payment/verify', protect, authorize('STUDENT'), alumniController.verifyServicePayment);
router.get('/services/bookings/my', protect, authorize('STUDENT'), alumniController.getMyBookings);
router.post('/services/complete', protect, authorize('STUDENT'), alumniController.completeService);

// Protected routes (Shared)
router.use(protect);

// Chat & Communication (Accessible by Alumni and Student)
router.get('/chat/:id', alumniController.getChat);
router.post('/chat/:id', alumniController.sendChatMessage);
router.get('/chats', alumniController.getChatThreads);

// Protected routes (Alumni Only)
router.use(authorize('ALUMNI', 'ADMIN'));

// 1. Auth/Profile
router.post('/logout', alumniController.logout);
router.get('/me', alumniController.getMe);
router.get('/profile', alumniController.getProfile);
router.put('/profile', alumniController.updateProfile);

// 2. Dashboard
router.get('/dashboard/summary', alumniController.getDashboardSummary);
router.get('/dashboard/activity', alumniController.getDashboardActivity);

// 4. Payments
router.get('/payments', alumniController.getPayments);
router.get('/payments/summary', alumniController.getPaymentSummary);
router.put('/bank-details', alumniController.updateBankDetails);

// 5. Services
router.get('/services', alumniController.getServices);
router.get('/services/bookings', alumniController.getAlumniBookings);
router.post('/services', alumniController.createService);
router.put('/services/:id', alumniController.updateService);
router.patch('/services/:id/status', alumniController.updateServiceStatus);
router.post('/services/:id/request-verification', alumniController.requestVerification);

// 6. Student Requests (Alumni Management)
router.get('/requests', alumniController.getRequests);
router.patch('/requests/:id/accept', alumniController.acceptRequest);
router.patch('/requests/:id/reject', alumniController.rejectRequest);

// 7. Jobs
router.get('/jobs', alumniController.getJobs);
router.post('/jobs', alumniController.createJob);
router.get('/jobs/performance', alumniController.getJobPerformance);

// 8. Training
router.post('/training/language-request', alumniController.requestLanguageTraining);
router.post('/training/technical-request', alumniController.requestTechnicalTraining);

// 9. Internship & Career
router.post('/internships', alumniController.addInternship);
router.post('/career/progress', alumniController.addCareerProgress);
router.get('/career/analytics', alumniController.getCareerAnalytics);

// 10. PR Tracker
router.get('/pr-status', alumniController.getPRStatus);
router.post('/pr-status', alumniController.updatePRStatus);
router.get('/pr-timelines', alumniController.getPRTimelines);

// 11. Public Insights
router.get('/stats/employment', alumniController.getEmploymentStats);
router.get('/stats/salary-range', alumniController.getSalaryRangeStats);

// 12. Referrals
router.get('/referrals', alumniController.getReferrals);
router.get('/referrals/summary', alumniController.getReferralSummary);
router.get('/referral-link', alumniController.getReferralLink);

// 13. Brand Ambassador
router.post('/brand-ambassador/apply', alumniController.applyAmbassador);
router.get('/brand-ambassador/status', alumniController.getAmbassadorStatus);

// 14. Content
router.get('/media-feed', alumniController.getMediaFeed);

// 15. Notifications
router.get('/notifications', alumniController.getNotifications);
router.patch('/notifications/:id/read', alumniController.markNotificationRead);

module.exports = router;
