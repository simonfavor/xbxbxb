const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Withdrawal = require('../models/Withdrawal');


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


// Withdrawal Request Email Template
function getWithdrawalRequestEmailHTML(user, withdrawalData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Withdrawal Request Received - GNF Invest</title>
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
        .transaction-card {
          background-color: white;
          border: 1px solid #e1e1e1;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
        }
        .detail-label {
          font-weight: bold;
        }
        .security-alert {
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
        <h2>Withdrawal Request Received</h2>
      </div>
      
      <div class="content">
        <div class="illustration">
          <!-- Placeholder for illustration - in production, use actual image URL -->
          <div style="background-color: #0D9488; color: white; width: 150px; height: 150px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 60px;">⇨</div>
          <p style="margin-top: 10px; font-weight: bold;">Withdrawal Processing</p>
        </div>
        
        <p>Dear ${user.firstName},</p>
        
        <p>We've received your request to withdraw <span class="highlight">${withdrawalData.amount} ${withdrawalData.cryptoCurrency}</span> from your GNF Invest account.</p>
        
        <div class="transaction-card">
          <h3 style="margin-top: 0;">Withdrawal Details</h3>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span>${withdrawalData.amount} ${withdrawalData.cryptoCurrency}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Destination Wallet:</span>
            <span style="word-break: break-all;">${withdrawalData.walletAddress}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Request Date:</span>
            <span>${new Date().toLocaleString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span>Processing</span>
          </div>
        </div>
        
        <div class="security-alert">
          <h3 style="margin-top: 0;">Security Alert</h3>
          <p>If you didn't initiate this withdrawal, please contact our security team immediately at <span class="highlight">security@gnfinvest.com</span>.</p>
          <p>For your protection:</p>
          <ul>
            <li>Never share your account credentials</li>
            <li>Enable two-factor authentication</li>
            <li>Verify withdrawal emails carefully</li>
          </ul>
        </div>
        
        <p>Our team is processing your request and you'll receive another email once your withdrawal is approved and sent to your wallet.</p>
        
        <p>Typical processing time: <span class="highlight">1-3 business hours</span>.</p>
        
        <div style="text-align: center;">
          <a href="https://gnfinvest.com/dashboard/withdrawals" class="button">View Withdrawal Status</a>
        </div>
        
        <p>Thank you for investing with GNF Invest. We're committed to providing you with secure and efficient financial services.</p>
      </div>
      
      <div class="footer">
        <p>© 2023 GNF Invest. All rights reserved.</p>
        <p>This email confirms your withdrawal request. Please keep it for your records.</p>
      </div>
    </body>
    </html>
  `;
}

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

// Request withdrawal (updated with email)
router.post('/', authMiddleware, async (req, res) => {
  const { amount, cryptoCurrency, walletAddress } = req.body;

  try {
    const withdrawal = new Withdrawal({
      user: req.user._id,
      amount,
      cryptoCurrency,
      walletAddress,
      type: 'Withdrawal'
    });
    await withdrawal.save();

    // Send withdrawal request email
    const user = await User.findById(req.user._id);
    const mailOptions = {
      from: '"GNF Invest" <fincch@zohomail.com>',
      to: user.email,
      subject: `Withdrawal Request Received - ${amount} ${cryptoCurrency}`,
      html: getWithdrawalRequestEmailHTML(user, withdrawal),
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json(withdrawal);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;