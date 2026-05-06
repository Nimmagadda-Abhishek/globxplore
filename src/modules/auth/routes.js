const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { protect } = require('../../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);
router.put('/change-password', protect, authController.changePassword);

module.exports = router;
