const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const Withdrawal = require('../models/Withdrawal');
const Wallet = require('../models/Wallet');

// Admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (username !== process.env.ADMIN_USERNAME) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Hash the admin password in .env during setup (one-time, not here)
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10); // Run once, store in .env
    const isMatch = await bcrypt.compare(password, hashedPassword); // Compare with hashed

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      username,
      role: 'admin',
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all transactions with filtering
router.get('/transactions', async (req, res) => {
    try {
      const { status, type } = req.query;
      let result = [];
      
      const statusFilter = {};
      if (status === 'pending') statusFilter.status = 'Pending';
      else if (status === 'completed') statusFilter.status = 'Completed';
      else if (status === 'rejected') statusFilter.status = 'Failed';
      
      // If looking for plan transactions
      if (type === 'plans') {
        const transactions = await Transaction.find({
          ...statusFilter,
          type: 'Plan Activation'
        })
          .populate('user', 'username email')
          .populate('plan')
          .sort({ createdAt: -1 });
        
        result = transactions;
      } 
      // If looking for withdrawal transactions
      else if (type === 'withdrawals') {
        const withdrawals = await Withdrawal.find(statusFilter)
          .populate('user', 'username email')
          .sort({ createdAt: -1 });
        
        // Map withdrawals to match transaction format expected by frontend
        result = withdrawals.map(withdrawal => ({
          _id: withdrawal._id,
          user: withdrawal.user,
          amount: withdrawal.amount,
          status: withdrawal.status,
          type: 'Withdrawal',
          createdAt: withdrawal.createdAt,
          cryptoCurrency: withdrawal.cryptoCurrency,
          walletAddress: withdrawal.walletAddress
        }));
      }
      
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
// Update transaction status - needs to handle both types
router.put('/transactions/:id', async (req, res) => {
try {
    const { status, transactionType } = req.body;
    let updatedItem;
    
    // Check if this is a withdrawal first
    if (transactionType === 'Withdrawal') {
    updatedItem = await Withdrawal.findById(req.params.id);
    if (!updatedItem) {
        return res.status(404).json({ message: 'Withdrawal not found' });
    }
    
    // Update withdrawal status
    updatedItem.status = status;
    await updatedItem.save();
    } else {
    // Otherwise handle as regular transaction
    updatedItem = await Transaction.findById(req.params.id);
    if (!updatedItem) {
        return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Update transaction status
    updatedItem.status = status;
    await updatedItem.save();
    
    // If this is a plan activation transaction, also update the plan status
    if (updatedItem.type === 'Plan Activation' && updatedItem.plan) {
        const plan = await Plan.findById(updatedItem.plan);
        if (plan) {
        plan.status = status === 'Completed' ? 'Active' : 'Failed';
        await plan.save();
        }
    }
    }
    
    res.json({ message: 'Transaction updated', transaction: updatedItem });
} catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
}
});

// Get user transactions (admin only)
router.get('/users/:userId/transactions', async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Verify the user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const transactions = await Transaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate('plan', 'name duration returnRate');
  
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get user withdrawals (admin only)
  router.get('/users/:userId/withdrawals', async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Verify the user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const withdrawals = await Withdrawal.find({ user: userId })
        .sort({ createdAt: -1 });
  
      res.json(withdrawals);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });


// Get all wallets
router.get('/', async (req, res) => {
    try {
      const wallets = await Wallet.find().sort({ name: 1 });
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get active wallets
  router.get('/active', async (req, res) => {
    try {
      const wallets = await Wallet.find({ isActive: true }).sort({ name: 1 });
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching active wallets:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create new wallet
  router.post('/', async (req, res) => {
    try {
      const { name, symbol, network, contractAddress, walletAddress, iconUrl } = req.body;
      
      const existingWallet = await Wallet.findOne({ $or: [{ name }, { symbol }] });
      if (existingWallet) {
        return res.status(400).json({ message: 'Wallet with this name or symbol already exists' });
      }
  
      const wallet = new Wallet({
        name,
        symbol,
        network,
        contractAddress,
        walletAddress,
        iconUrl
      });
  
      await wallet.save();
      res.status(201).json(wallet);
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update wallet
  router.put('/:id', async (req, res) => {
    try {
      const { name, symbol, network, contractAddress, walletAddress, isActive, iconUrl } = req.body;
      
      const wallet = await Wallet.findById(req.params.id);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
  
      // Check if name or symbol already exists for another wallet
      const existingWallet = await Wallet.findOne({
        $and: [
          { _id: { $ne: req.params.id } },
          { $or: [{ name }, { symbol }] }
        ]
      });
      
      if (existingWallet) {
        return res.status(400).json({ message: 'Another wallet with this name or symbol already exists' });
      }
  
      wallet.name = name || wallet.name;
      wallet.symbol = symbol || wallet.symbol;
      wallet.network = network || wallet.network;
      wallet.contractAddress = contractAddress || wallet.contractAddress;
      wallet.walletAddress = walletAddress || wallet.walletAddress;
      wallet.isActive = typeof isActive !== 'undefined' ? isActive : wallet.isActive;
      wallet.iconUrl = iconUrl || wallet.iconUrl;
  
      await wallet.save();
      res.json(wallet);
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete wallet
  router.delete('/:id', async (req, res) => {
    try {
      const wallet = await Wallet.findByIdAndDelete(req.params.id);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      res.json({ message: 'Wallet deleted successfully' });
    } catch (error) {
      console.error('Error deleting wallet:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;