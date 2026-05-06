const express = require('express');
const router = express.Router();
const offerController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);

router.get('/', offerController.getActiveOffers);
router.post('/', authorize('ADMIN'), offerController.createOffer);

module.exports = router;
