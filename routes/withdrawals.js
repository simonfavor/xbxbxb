const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');


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

  console.log('Withdrawal request:', req.body);

  try {
    // Create withdrawal record
    const withdrawal = new Withdrawal({
      user: req.user._id,
      amount,
      cryptoCurrency,
      walletAddress,
      type: 'Withdrawal'
    });
    await withdrawal.save();

    // Get user details
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Format amount
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

    // Withdrawal request email template
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #0D9488; padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Withdrawal Request Received</h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 25px;">
          <p>Dear ${user.firstName},</p>
          
          <p>We've received your request to withdraw <strong>${formattedAmount}</strong> in <strong>${cryptoCurrency}</strong>.</p>
          
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #0D9488;">Withdrawal Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Amount:</td>
                <td style="padding: 8px 0; font-weight: bold;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Currency:</td>
                <td style="padding: 8px 0; font-weight: bold;">${cryptoCurrency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Wallet Address:</td>
                <td style="padding: 8px 0; font-weight: bold; word-break: break-all;">${walletAddress}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Status:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #F59E0B;">Processing</td>
              </tr>
            </table>
          </div>
          
          <p style="font-weight: bold; color: #0D9488;">Next Steps:</p>
          <ol style="padding-left: 20px; color: #555;">
            <li>Our team is reviewing your request (typically within 24-48 hours)</li>
            <li>You'll receive an email notification once approved</li>
            <li>Funds will be sent to your wallet address</li>
          </ol>
          
          <p style="font-size: 14px; color: #666; border-left: 3px solid #F59E0B; padding-left: 10px;">
            <em>Note: This is an automated message. Please do not reply directly to this email.</em>
          </p>
          
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

    // Send withdrawal request email
    const mailOptions = {
      from: `GNF Withdrawals <${process.env.Zoho_User}>`,
      to: user.email,
      subject: `Withdrawal Request Received - ${formattedAmount} ${cryptoCurrency}`,
      html: htmlTemplate
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal
    });

  } catch (error) {
    console.log('Withdrawal request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing withdrawal request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;