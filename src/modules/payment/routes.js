const express = require('express');
const router = express.Router();
const paymentController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);

// Payment Requests (Invoices)
router.post('/request', authorize('ADMIN', 'COUNSELLOR'), paymentController.createPaymentRequest);
router.get('/my-requests', authorize('STUDENT'), paymentController.getMyPaymentRequests);

// Razorpay Integration
router.post('/order', authorize('ADMIN', 'AGENT', 'COUNSELLOR', 'STUDENT'), paymentController.createPaymentOrder);
router.post('/verify', authorize('ADMIN', 'AGENT', 'COUNSELLOR', 'STUDENT'), paymentController.verifyPayment);

module.exports = router;
