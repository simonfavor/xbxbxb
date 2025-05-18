const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Plan = require('../models/Plan');
const Transaction = require('../models/Transaction');
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

// Select a plan (updated with email)
router.post('/', authMiddleware, async (req, res) => {
  const { type, amount, roi, withdrawalPeriod } = req.body;

  try {
    // Create new plan
    const plan = new Plan({
      user: req.user._id,
      type,
      amount,
      roi,
      withdrawalPeriod,
    });
    await plan.save();

    // Record transaction
    const transaction = new Transaction({
      user: req.user._id,
      type: 'Plan Activation',
      amount,
      plan: plan._id,
      status: 'Pending',
    });
    await transaction.save();

    // Get user details
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format amount for display
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

    // Prepare email template
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #0D9488; padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Your ${type} Plan is Ready!</h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 25px;">
          <p>Dear ${user.firstName},</p>
          
          <p>Thank you for selecting the <strong>${type}</strong> plan with GNF. Your plan details have been successfully submitted and are now pending approval.</p>
          
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #0D9488;">Plan Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Plan Type:</td>
                <td style="padding: 8px 0; font-weight: bold;">${type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Investment Amount:</td>
                <td style="padding: 8px 0; font-weight: bold;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Estimated ROI:</td>
                <td style="padding: 8px 0; font-weight: bold;">${roi}%</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Withdrawal Period:</td>
                <td style="padding: 8px 0; font-weight: bold;">${withdrawalPeriod}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-weight: bold; color: #0D9488;">Next Steps:</p>
          <ol style="padding-left: 20px; color: #555;">
            <li>Complete your payment to activate the plan</li>
            <li>Our team will review your submission (1-2 business days)</li>
            <li>You'll receive a confirmation email once approved</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard/plans/${plan._id}" 
               style="background-color: #F59E0B; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold; 
                      display: inline-block; font-size: 16px;">
              Complete Payment
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

    // Send email
    const mailOptions = {
      from: `GNF Plans <${process.env.Zoho_User}>`,
      to: user.email,
      subject: `Action Required: Complete Payment for Your ${type} Plan`,
      html: htmlTemplate
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      success: true,
      message: 'Plan created successfully. Please check your email for next steps.',
      plan,
      transaction 
    });

  } catch (error) {
    console.error('Plan creation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating plan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Simulate payment confirmation (updated with email)
router.post('/confirm-payment/:planId', authMiddleware, async (req, res) => {
  try {
    // Find and validate plan
    const plan = await Plan.findById(req.params.planId);
    if (!plan || plan.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ 
        success: false,
        message: 'Plan not found or unauthorized' 
      });
    }

    // Update plan status
    plan.status = 'Active';
    plan.activationDate = new Date();
    await plan.save();

    // Update transaction status
    const transaction = await Transaction.findOneAndUpdate(
      { plan: plan._id, type: 'Plan Activation' },
      { status: 'Completed', processedAt: new Date() },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Get user details
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format dates and amounts
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(plan.amount);

    const activationDate = plan.activationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Payment confirmation email template
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #0D9488; padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Confirmed!</h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 25px;">
          <p>Dear ${user.firstName},</p>
          
          <p>We've successfully received your payment of <strong>${formattedAmount}</strong> for your <strong>${plan.type}</strong> plan. Your investment is now being processed.</p>
          
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #0D9488;">Plan Activation Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Plan Type:</td>
                <td style="padding: 8px 0; font-weight: bold;">${plan.type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Investment Amount:</td>
                <td style="padding: 8px 0; font-weight: bold;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Activation Date:</td>
                <td style="padding: 8px 0; font-weight: bold;">${activationDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Plan Status:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0D9488;">Active (Pending Final Approval)</td>
              </tr>
            </table>
          </div>
          
          <p style="font-weight: bold; color: #0D9488;">What to Expect Next:</p>
          <ul style="padding-left: 20px; color: #555;">
            <li>Our team is verifying your payment details</li>
            <li>You'll receive a final approval notification within <strong>24-48 hours</strong></li>
            <li>Your investment will start earning returns after final approval</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard/plans/${plan._id}" 
               style="background-color: #F59E0B; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold; 
                      display: inline-block; font-size: 16px;">
              View Your Plan
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; border-left: 3px solid #F59E0B; padding-left: 10px;">
            <em>Note: Your funds are secure during this verification period.</em>
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

    // Send confirmation email
    const mailOptions = {
      from: `GNF Payments <${process.env.Zoho_User}>`,
      to: user.email,
      subject: `Payment Received - Your ${plan.type} Plan is Being Activated`,
      html: htmlTemplate
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true,
      message: 'Payment confirmed successfully. You will be notified when your plan is fully approved.',
      plan,
      transaction
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing payment confirmation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;