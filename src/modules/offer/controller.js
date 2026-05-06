const Offer = require('./model');

/**
 * Get all active offers. (For Agents or ANY authenticated user)
 */
exports.getActiveOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({ 
      isActive: true,
      $or: [
        { expiresAt: { $gte: new Date() } },
        { expiresAt: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });

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
