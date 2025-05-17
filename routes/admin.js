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

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'smtp.zoho.com',
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  logger: true,
  debug: true,
  secureConnection: false,
  auth: {
    user: process.Zoho_User, 
    pass: process.Zoho_Pass, 
  },
});


// Transaction Status Update Email Template
function getTransactionStatusEmailHTML(user, transactionData, isWithdrawal = false) {
  const isApproved = transactionData.status === 'Completed';
  const actionType = isWithdrawal ? 'Withdrawal' : transactionData.type;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Transaction ${isApproved ? 'Approved' : 'Rejected'} - GNF Invest</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
        }
        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .logo-circle {
          width: 40px;
          height: 40px;
          background-color: #F59E0B;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 10px;
        }
        .logo-text {
          font-size: 24px;
          font-weight: bold;
          color: #000;
        }
        .logo-text span {
          color: #F59E0B;
        }
        .content {
          background-color: #f9f9f9;
          padding: 25px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #0D9488;
          color: white;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          margin: 15px 0;
        }
        .highlight {
          color: #0D9488;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #777;
          margin-top: 30px;
        }
        .status-card {
          background-color: ${isApproved ? '#e6f7f6' : '#ffebee'};
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid ${isApproved ? '#0D9488' : '#f44336'};
          text-align: center;
        }
        .status-icon {
          font-size: 48px;
          color: ${isApproved ? '#0D9488' : '#f44336'};
          margin-bottom: 15px;
        }
        .transaction-details {
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
        }
        .detail-label {
          font-weight: bold;
        }
        .next-steps {
          background-color: #fff4e5;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #F59E0B;
        }
        .illustration {
          text-align: center;
          margin: 20px 0;
        }
        .illustration img {
          max-width: 200px;
          height: auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <div class="logo-circle">
            <span style="color: #0D9488; font-weight: bold; font-size: 14px;">GNF</span>
          </div>
          <div class="logo-text"><span>GNF</span> Invest</div>
        </div>
      </div>
      
      <div class="content">
        <div class="illustration">
          <!-- Placeholder for illustration - in production, use actual image URL -->
          <div style="background-color: ${isApproved ? '#0D9488' : '#f44336'}; color: white; width: 150px; height: 150px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 60px;">
            ${isApproved ? '✓' : '✗'}
          </div>
          <p style="margin-top: 10px; font-weight: bold;">
            ${isApproved ? 'Transaction Approved!' : 'Transaction Rejected'}
          </p>
        </div>
        
        <div class="status-card">
          <div class="status-icon">${isApproved ? '✓' : '✗'}</div>
          <h2 style="margin-top: 0;">${actionType} ${isApproved ? 'Approved' : 'Rejected'}</h2>
          <p>Your ${actionType.toLowerCase()} request has been ${isApproved ? 'successfully processed' : 'rejected'}.</p>
        </div>
        
        <p>Dear ${user.firstName},</p>
        
        <div class="transaction-details">
          <h3 style="margin-top: 0;">Transaction Details:</h3>
          <div class="detail-row">
            <span class="detail-label">Type:</span>
            <span>${actionType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span>${transactionData.amount} ${isWithdrawal ? transactionData.cryptoCurrency : 'USD'}</span>
          </div>
          ${isWithdrawal ? `
          <div class="detail-row">
            <span class="detail-label">Wallet Address:</span>
            <span style="word-break: break-all;">${transactionData.walletAddress}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span style="color: ${isApproved ? '#0D9488' : '#f44336'}; font-weight: bold;">
              ${transactionData.status}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date Processed:</span>
            <span>${new Date().toLocaleString()}</span>
          </div>
          ${!isApproved ? `
          <div class="detail-row">
            <span class="detail-label">Reason:</span>
            <span>${transactionData.reason || 'Please contact support for details'}</span>
          </div>
          ` : ''}
        </div>
        
        ${isApproved ? `
        <p>${isWithdrawal ? 'The funds have been sent to your specified wallet address and should arrive shortly.' : 'Your transaction has been successfully completed.'}</p>
        ` : `
        <div class="next-steps">
          <h3 style="margin-top: 0;">Next Steps:</h3>
          <p>If you believe this was a mistake or need assistance, please:</p>
          <ol>
            <li>Review your transaction details</li>
            <li>Contact our support team at <span class="highlight">support@gnfinvest.com</span></li>
            <li>Include your transaction ID: ${transactionData._id}</li>
          </ol>
        </div>
        `}
        
        <div style="text-align: center;">
          <a href="https://gnfinvest.com/dashboard/transactions" class="button">View Transaction Details</a>
        </div>
        
        <p>Thank you for using GNF Invest. We're committed to providing you with transparent and secure financial services.</p>
      </div>
      
      <div class="footer">
        <p>© 2023 GNF Invest. All rights reserved.</p>
        <p>This email confirms your transaction status update. Please keep it for your records.</p>
      </div>
    </body>
    </html>
  `;
}

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
  
// Update transaction status (updated with email)
router.put('/transactions/:id', async (req, res) => {
  try {
    const { status, transactionType, reason } = req.body;
    let updatedItem;
    
    // Check if this is a withdrawal first
    if (transactionType === 'Withdrawal') {
      updatedItem = await Withdrawal.findById(req.params.id);
      if (!updatedItem) {
        return res.status(404).json({ message: 'Withdrawal not found' });
      }
      
      // Update withdrawal status
      updatedItem.status = status;
      if (reason) updatedItem.reason = reason;
      await updatedItem.save();

      // Send status update email
      const user = await User.findById(updatedItem.user);
      const mailOptions = {
        from: '"GNF Invest" <fincch@zohomail.com>',
        to: user.email,
        subject: `Withdrawal ${status === 'Completed' ? 'Approved' : 'Rejected'} - ${updatedItem.amount} ${updatedItem.cryptoCurrency}`,
        html: getTransactionStatusEmailHTML(user, updatedItem, true),
      };
      await transporter.sendMail(mailOptions);
    } else {
      // Otherwise handle as regular transaction
      updatedItem = await Transaction.findById(req.params.id);
      if (!updatedItem) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Update transaction status
      updatedItem.status = status;
      if (reason) updatedItem.reason = reason;
      await updatedItem.save();
      
      // If this is a plan activation transaction, also update the plan status
      if (updatedItem.type === 'Plan Activation' && updatedItem.plan) {
        const plan = await Plan.findById(updatedItem.plan);
        if (plan) {
          plan.status = status === 'Completed' ? 'Active' : 'Failed';
          await plan.save();
        }
      }

      // Send status update email
      const user = await User.findById(updatedItem.user);
      const mailOptions = {
        from: '"GNF Invest" <fincch@zohomail.com>',
        to: user.email,
        subject: `Transaction ${status === 'Completed' ? 'Approved' : 'Rejected'} - ${updatedItem.type}`,
        html: getTransactionStatusEmailHTML(user, updatedItem),
      };
      await transporter.sendMail(mailOptions);
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