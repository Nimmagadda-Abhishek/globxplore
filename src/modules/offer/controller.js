const Offer = require('./model');

/**
 * Get all offers (both active and inactive).
 */
exports.getActiveOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({}).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
};

/**
 * Configure an offer (Admin only).
 */
exports.createOffer = async (req, res, next) => {
  try {
    const offer = await Offer.create(req.body);
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate/deactivate an offer (Admin only)
 * PATCH /api/offer/:id/active
 * body: { isActive: true|false }
 */
exports.setOfferActive = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive } },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an offer (Admin only).
 * DELETE /api/offer/:id
 */
exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};


