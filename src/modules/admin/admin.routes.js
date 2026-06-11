const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const usersController = require('./admin.users.controller');
const leadsController = require('./admin.leads.controller');
const studentsController = require('./admin.students.controller');
const studentPortalController = require('../student/student.controller');
const activityController = require('./admin.activity.controller');
const rolesController = require('./admin.roles.controller');
const visaPaymentController = require('./admin.visa_payment.controller');
const miscController = require('./admin.misc.controller');
const visaAgentsController = require('./admin.visa_agents.controller');
const alumniManagersController = require('./admin.alumni_managers.controller');
const agentPerformanceController = require('./admin.agent_performance.controller');
const staffController = require('../student/controller');

const { protect } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { authorize } = require('../../middleware/role');

// Public routes


// Protected routes
router.use(protect);

// 5. Lead Management APIs (Allowed for ADMIN and COUNSELLOR)
router.get('/leads', authorize('ADMIN', 'COUNSELLOR'), leadsController.getLeads);
router.get('/leads/analytics', authorize('ADMIN', 'COUNSELLOR'), leadsController.getLeadAnalytics);
router.get('/leads/:id', authorize('ADMIN', 'COUNSELLOR'), leadsController.getLeadById);

// 4. Attendance & Productivity APIs (Admin-facing, but allowed for Counsellors for performance viewing)
router.get('/attendance', authorize('ADMIN', 'COUNSELLOR'), activityController.getAttendance);
router.get('/attendance', authorize('ADMIN', 'COUNSELLOR'), activityController.getAttendance);

// Admin: calculate + store daily attendance for a custom period
router.post('/attendance/calculate', authorize('ADMIN'), activityController.calculateAttendanceForRange);

// Admin: download/export stored attendance for a custom period as CSV
router.get('/attendance/export', authorize('ADMIN'), activityController.exportAttendanceForRangeCsv);

// Must be after /attendance/export so "export" doesn't match :userId
router.get('/attendance/:userId', authorize('ADMIN', 'COUNSELLOR'), activityController.getUserAttendance);
router.get('/performance', authorize('ADMIN', 'COUNSELLOR'), activityController.getPerformance);



// 6. Student APIs (Allowed for ADMIN and COUNSELLOR)
router.get('/students', authorize('ADMIN', 'COUNSELLOR'), studentsController.getStudents);
router.get('/students/pipeline', authorize('ADMIN', 'COUNSELLOR'), studentsController.getStudentPipeline);
router.get('/students/intake-stats', authorize('ADMIN', 'COUNSELLOR'), studentsController.getIntakeStats);
router.get('/students/:id', authorize('ADMIN', 'COUNSELLOR'), studentsController.getStudentById);
router.patch('/students/:id/stage', authorize('ADMIN', 'COUNSELLOR'), studentsController.updateStudentStage);
router.post('/students/:id/message', authorize('ADMIN', 'COUNSELLOR'), staffController.addMessage);

// Everything else below is ADMIN only
router.use(authorize('ADMIN'));

router.post('/logout', adminController.logout);
router.get('/me', adminController.getMe);

// Admin-only Lead Management
router.patch('/leads/:id/assign', leadsController.assignLead);
router.post('/leads/bulk-upload', leadsController.bulkUploadLeads);

// 2. Dashboard APIs
router.get('/dashboard/summary', adminController.getDashboardSummary);
router.get('/dashboard/charts/export', adminController.exportDashboardCharts);
router.get('/dashboard/charts', adminController.getDashboardCharts);

// 2b. Alerts APIs
router.get('/alerts', miscController.getAlerts);

// 3. User Management APIs
router.post('/users', usersController.createUser);
router.post('/counsellors', usersController.createCounsellor);
router.get('/users', usersController.getUsers);
router.get('/users/:id', usersController.getUserById);
router.put('/users/:id', usersController.updateUser);
router.patch('/users/:id/status', usersController.updateUserStatus);
router.post('/users/:id/reset-password', usersController.resetUserPassword);
router.patch('/users/:userId/update-credentials', usersController.updateUserPasswordEmail);
router.patch('/users/:userId/lock', usersController.lockUnlockUser);


// Student Registration Approval
router.get('/pending-registrations', studentPortalController.getPendingRegistrations);
router.patch('/approve-student/:id', studentPortalController.approveStudent);
router.patch('/reject-student/:id', studentPortalController.rejectStudent);

// 7. Counsellor APIs
router.get('/counsellors', rolesController.getCounsellors);
router.get('/counsellors/:id/analytics', rolesController.getCounsellorAnalytics);
router.patch('/counsellors/:id/reassign', rolesController.reassignCounsellorStudents);

// 8. Telecaller APIs
router.get('/telecallers', rolesController.getTelecallers);
router.get('/telecallers/:id/analytics', rolesController.getTelecallerAnalytics);
router.patch('/telecallers/:id/reassign', rolesController.reassignTelecallerLeads);

// 9. Agent APIs
router.get('/agents', rolesController.getAgents); // KPI summary
router.get('/agents/summary', rolesController.getAgentsSummary); // raw list
router.get('/agents/map', rolesController.getAgentsMap);
router.get('/agent-managers', rolesController.getAgentManagers);
router.get('/agents/:id', rolesController.getAgentById);
router.patch('/agents/:id/status', rolesController.updateAgentStatus);


// Alumni Managers APIs
router.post('/alumni-managers', alumniManagersController.createAlumniManager);
router.get('/alumni-managers', alumniManagersController.getAlumniManagers);
router.get('/alumni-managers/:id', alumniManagersController.getAlumniManagerById);
router.patch('/alumni-managers/:id/status', alumniManagersController.updateAlumniManagerStatus);
router.get('/alumni-managers/:id/analytics', alumniManagersController.getAlumniManagerAnalytics);


// 10. Visa APIs
router.post('/visa-agents', visaAgentsController.createVisaAgent);
router.get('/visa-agents', visaAgentsController.getVisaAgents);
router.patch('/visa-agents/:id/status', visaAgentsController.updateVisaAgentStatus);

router.get('/visa', visaPaymentController.getVisas);
router.get('/visa/analytics', visaPaymentController.getVisaAnalytics);
router.get('/visa/:id', visaPaymentController.getVisaById);
router.patch('/visa/:id/status', visaPaymentController.updateVisaStatus);

// 11. Payment APIs
router.get('/payments', visaPaymentController.getPayments);
router.get('/payments/summary', visaPaymentController.getPaymentSummary);
router.get('/payments/:id', visaPaymentController.getPaymentById);
router.post('/payments/refund/:id', visaPaymentController.initiateRefund);

// 12. Agent Performance API
router.get('/agents/performance', agentPerformanceController.getAgentPerformance);

// 12b. Partner Offer APIs
router.get('/offers', miscController.getOffers);

// 13. Document Center APIs
router.post('/documents/upload', upload.single('file'), miscController.uploadDocument);
router.get('/documents', miscController.getDocuments);
router.get('/documents/:id', miscController.getDocumentById);
router.delete('/documents/:id', miscController.deleteDocument);

// 14. Reports APIs
router.get('/reports/weekly', miscController.getWeeklyReport);

// 15. Notifications APIs
router.post('/notifications/broadcast', miscController.broadcastNotification);

// 16. Settings APIs
router.get('/settings', miscController.getSettings);

// 17. Audit Logs APIs
router.get('/audit-logs', miscController.getAuditLogs);

module.exports = router;
