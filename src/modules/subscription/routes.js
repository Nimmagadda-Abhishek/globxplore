const express = require('express');
const router = express.Router();
const subscriptionController = require('./controller');
const { protect } = require('../../middleware/auth');

// Public route to see plans (or protect if only logged in users can see)
router.get('/', subscriptionController.getPlans);
router.get('/:id', subscriptionController.getPlanById);

module.exports = router;
