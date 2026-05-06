const SubscriptionPlan = require('./model');

exports.getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};
