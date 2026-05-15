const express = require('express');
const router = express.Router();
const studentController = require('./student.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');
const upload = require('../../middleware/upload');

// Public routes
router.post('/register', studentController.register);


// Protected routes (Student only)
router.use(protect);
router.get('/me', studentController.getMe);
router.get('/dashboard', studentController.getDashboard);
router.get('/alerts', studentController.getAlerts);
router.put('/profile', studentController.updateProfile);

// Documents
router.post('/documents', upload.single('file'), studentController.uploadDocument);
router.get('/documents', studentController.getDocuments);

// Subscriptions
router.get('/subscriptions/plans', studentController.getPlans);
router.post('/subscription/order', studentController.createOrder);
router.post('/subscription/verify', studentController.verifyPayment);

module.exports = router;
