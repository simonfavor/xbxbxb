const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Withdrawal = require('../models/Withdrawal');

// Get withdrawal history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id })
    .populate('user', 'username email')
    

    console.log(withdrawals)
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Request withdrawal
router.post('/', authMiddleware, async (req, res) => {
    const { amount, cryptoCurrency, walletAddress } = req.body;
  
    try {
      const withdrawal = new Withdrawal({
        user: req.user._id,
        amount,
        cryptoCurrency,
        walletAddress,
        type: 'Withdrawal' // Adding type for consistency with transactions
      });
      await withdrawal.save();
      res.status(201).json(withdrawal);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;