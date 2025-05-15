const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Plan = require('../models/Plan');
const Transaction = require('../models/Transaction');

// Get user's plans
router.get('/', authMiddleware, async (req, res) => {
  try {
    const plans = await Plan.find({ user: req.user._id });
    console.log(plans)
    res.json(plans);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' });
  }
});

// Select a plan
router.post('/', authMiddleware, async (req, res) => {
  const { type, amount, roi, withdrawalPeriod } = req.body;
  console.log(req.body)

  try {
    const plan = new Plan({
      user: req.user._id,
      type,
      amount,
      roi,
      withdrawalPeriod,
    });
    await plan.save();

    const transaction = new Transaction({
      user: req.user._id,
      type: 'Plan Activation',
      amount,
      plan: plan._id,
      status: 'Pending',
    });
    await transaction.save();

    res.status(201).json({ plan, transaction });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' });
  }
});

// Simulate payment confirmation
router.post('/confirm-payment/:planId', authMiddleware, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.planId);
    if (!plan || plan.user.toString() !== req.user._id) {
        console.log('Plan not found')
      return res.status(404).json({ message: 'Plan not found' });
    }

    plan.status = 'Pending';
    await plan.save();

    const transaction = await Transaction.findOne({ plan: plan._id, type: 'Plan Activation' });
    transaction.status = 'Pending';
    await transaction.save();

    res.json({ message: 'Payment confirmed', plan });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;