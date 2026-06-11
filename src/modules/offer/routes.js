const express = require('express');
const router = express.Router();
const offerController = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);

router.get('/', offerController.getActiveOffers);
router.post('/', authorize('ADMIN'), offerController.createOffer);
// Admin toggle endpoint used by UI
// UI calls: PATCH /api/offer/:id/activate
router.patch('/:id/activate', authorize('ADMIN'), offerController.setOfferActive);

module.exports = router;

