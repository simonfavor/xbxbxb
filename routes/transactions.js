const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// Get transaction history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).populate('plan');
    console.log(transactions)
    res.json(transactions);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;