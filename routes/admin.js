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
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: 'gnfcontact@zohomail.com', 
    pass: 'K9XscvTZJ32e', 
  },
});


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
        return res.status(404).json({ success: false, message: 'Withdrawal not found' });
      }
      
      // Update withdrawal status
      updatedItem.status = status;
      if (reason) updatedItem.reason = reason;
      await updatedItem.save();

      // Get user details
      const user = await User.findById(updatedItem.user);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Format amount
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(updatedItem.amount);

      // Withdrawal status email template
      const withdrawalHtmlTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: ${status === 'Completed' ? '#0D9488' : '#dc2626'}; padding: 25px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              Withdrawal ${status === 'Completed' ? 'Approved' : 'Rejected'}
            </h1>
          </div>
          
          <!-- Body -->
          <div style="padding: 25px;">
            <p>Dear ${user.firstName},</p>
            
            <p>Your withdrawal request has been <strong>${status === 'Completed' ? 'approved' : 'rejected'}</strong>.</p>
            
            <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h3 style="margin-top: 0; color: #0D9488;">Withdrawal Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Amount:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Method:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${updatedItem.cryptoCurrency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Status:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: ${status === 'Completed' ? '#0D9488' : '#dc2626'};">
                    ${status === 'Completed' ? 'Completed' : 'Rejected'}
                  </td>
                </tr>
                ${status !== 'Completed' ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Reason:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${reason || 'Not specified'}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${status === 'Completed' ? `
            <p>Your funds should arrive in your wallet within <strong>1-3 business days</strong>.</p>
            ` : `
            <p>If you believe this was a mistake or need clarification, please contact our support team.</p>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard/transactions" 
                 style="background-color: #F59E0B; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 4px; font-weight: bold; 
                        display: inline-block; font-size: 16px;">
                View Transaction
              </a>
            </div>
            
            <!-- Contact Section -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #0D9488;">Need Help?</h3>
              <p style="color: #666; margin-bottom: 8px;">123 Street, Finance City, FC 12345</p>
              <p style="color: #666; margin-bottom: 8px;">Phone: +1 (555) 123-4567</p>
              <p style="color: #666; margin-bottom: 0;">Email: support@gnf.com</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} GNF. All rights reserved.
          </div>
        </div>
      `;

      // Send withdrawal status email
      const mailOptions = {
        from: `GNF Withdrawals <${process.env.Zoho_User}>`,
        to: user.email,
        subject: `Withdrawal ${status === 'Completed' ? 'Approved' : 'Rejected'} - ${formattedAmount}`,
        html: withdrawalHtmlTemplate
      };
      await transporter.sendMail(mailOptions);

    } else {
      // Handle regular transaction (Plan Activation)
      updatedItem = await Transaction.findById(req.params.id);
      if (!updatedItem) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
      
      // Update transaction status
      updatedItem.status = status;
      if (reason) updatedItem.reason = reason;
      await updatedItem.save();
      
      // If this is a plan activation transaction, also update the plan status
      let plan;
      if (updatedItem.type === 'Plan Activation' && updatedItem.plan) {
        plan = await Plan.findById(updatedItem.plan);
        if (plan) {
          plan.status = status === 'Completed' ? 'Active' : 'Failed';
          await plan.save();
        }
      }

      // Get user details
      const user = await User.findById(updatedItem.user);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Format amount
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(updatedItem.amount);

      // Plan status email template
      const planHtmlTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: ${status === 'Completed' ? '#0D9488' : '#dc2626'}; padding: 25px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              Plan ${status === 'Completed' ? 'Approved' : 'Rejected'}
            </h1>
          </div>
          
          <!-- Body -->
          <div style="padding: 25px;">
            <p>Dear ${user.firstName},</p>
            
            <p>Your ${updatedItem.type} has been <strong>${status === 'Completed' ? 'approved' : 'rejected'}</strong>.</p>
            
            <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h3 style="margin-top: 0; color: #0D9488;">Transaction Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Type:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${updatedItem.type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Amount:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${formattedAmount}</td>
                </tr>
                ${plan ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Plan:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${plan.type}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666;">Status:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: ${status === 'Completed' ? '#0D9488' : '#dc2626'};">
                    ${status === 'Completed' ? 'Completed' : 'Rejected'}
                  </td>
                </tr>
                ${status !== 'Completed' ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Reason:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${reason || 'Not specified'}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${status === 'Completed' ? `
            <p>Your plan is now active and will start earning returns according to the terms.</p>
            ` : `
            <p>If you believe this was a mistake or need clarification, please contact our support team.</p>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard/${plan ? 'plans' : 'transactions'}" 
                 style="background-color: #F59E0B; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 4px; font-weight: bold; 
                        display: inline-block; font-size: 16px;">
                View ${plan ? 'Plan' : 'Transaction'}
              </a>
            </div>
            
            <!-- Contact Section -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #0D9488;">Need Help?</h3>
              <p style="color: #666; margin-bottom: 8px;">123 Street, Finance City, FC 12345</p>
              <p style="color: #666; margin-bottom: 8px;">Phone: +1 (555) 123-4567</p>
              <p style="color: #666; margin-bottom: 0;">Email: support@gnf.com</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} GNF. All rights reserved.
          </div>
        </div>
      `;

      // Send plan status email
      const mailOptions = {
        from: `GNF Plans <${process.env.Zoho_User}>`,
        to: user.email,
        subject: `Plan ${status === 'Completed' ? 'Approved' : 'Rejected'} - ${updatedItem.type}`,
        html: planHtmlTemplate
      };
      await transporter.sendMail(mailOptions);
    }
    
    res.json({ 
      success: true,
      message: `Transaction ${status === 'Completed' ? 'approved' : 'rejected'} successfully`,
      transaction: updatedItem
    });

  } catch (error) {
    console.error('Transaction update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating transaction status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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