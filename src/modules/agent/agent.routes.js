const express = require('express');
const router = express.Router();
const agentController = require('./agent.controller');
const { protect } = require('../../middleware/auth');
const { authorize, requireConfirmedAgent } = require('../../middleware/role');
const upload = require('../../middleware/upload');

// 1. Authentication APIs

router.post('/logout', protect, authorize('AGENT'), agentController.logout);
router.get('/me', protect, authorize('AGENT'), agentController.getMe);

// 2. Dashboard APIs
router.get('/dashboard/summary', protect, authorize('AGENT'), agentController.getDashboardSummary);
router.get('/dashboard/updates', protect, authorize('AGENT'), agentController.getDashboardUpdates);

// 3. Student APIs
router.post('/students', protect, authorize('AGENT'), agentController.createStudent);
router.get('/students', protect, authorize('AGENT'), agentController.getStudents);
router.get('/students/status-summary', protect, authorize('AGENT'), agentController.getStudentStatusSummary);
router.get('/students/:id', protect, authorize('AGENT'), agentController.getStudentById);
router.put('/students/:id', protect, authorize('AGENT'), agentController.updateStudent);

// 4. Student Pipeline APIs (View Only)
router.get('/students/:id/pipeline', protect, authorize('AGENT'), agentController.getStudentPipeline);

// 5. Commission APIs
router.get('/commissions', protect, authorize('AGENT'), agentController.getCommissions);
router.get('/commissions/summary', protect, authorize('AGENT'), agentController.getCommissionSummary);

// 6. Business Profile APIs
router.get('/business-profile', protect, authorize('AGENT'), agentController.getBusinessProfile);
router.put('/business-profile', protect, authorize('AGENT'), agentController.updateBusinessProfile);
router.post('/business-board-photo', protect, authorize('AGENT'), upload.single('file'), agentController.uploadBusinessBoardPhoto);

// 7. Bank Details APIs
router.get('/bank-details', protect, authorize('AGENT'), agentController.getBankDetails);
router.put('/bank-details', protect, authorize('AGENT'), agentController.updateBankDetails);

// 8. MOU APIs
router.post('/mou/upload', protect, authorize('AGENT'), upload.single('file'), agentController.uploadMou);
router.get('/mou', protect, authorize('AGENT'), agentController.getMouDetails);

// 9. QR Code APIs
router.get('/qr-code', protect, authorize('AGENT'), agentController.getQrCode);
router.get('/referral-link', protect, authorize('AGENT'), agentController.getReferralLink);

// 10. Offers & Benefits APIs
router.get('/offers', protect, authorize('AGENT'), agentController.getOffers);
router.get('/benefits', protect, authorize('AGENT'), agentController.getBenefits);

// 11. Notifications APIs
router.get('/notifications', protect, authorize('AGENT'), agentController.getNotifications);
router.patch('/notifications/:id/read', protect, authorize('AGENT'), agentController.markNotificationRead);

// 12. Support APIs
router.post('/contact-admin', protect, authorize('AGENT'), agentController.contactAdmin);
router.post('/request-service-details', protect, authorize('AGENT'), agentController.requestServiceDetails);

// 13. Search APIs
router.get('/search/students', protect, authorize('AGENT'), agentController.searchStudents);
router.get('/search/business', protect, authorize('AGENT'), agentController.searchBusiness);

// 14. Analytics APIs
router.get('/analytics', protect, authorize('AGENT'), agentController.getAnalytics);

// 15. Lead APIs
router.post('/leads', protect, authorize('AGENT'), requireConfirmedAgent, agentController.createLead);
router.get('/leads', protect, authorize('AGENT'), agentController.getLeads);

module.exports = router;
