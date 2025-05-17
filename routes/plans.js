const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Plan = require('../models/Plan');
const Transaction = require('../models/Transaction');


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


// Add these template functions to your existing email templates
function getPlanSelectedEmailHTML(user, planData) {
  const planInfo = investmentPlans.find(p => p.name === planData.type);
  const planColor = planInfo ? planInfo.color : 'from-primary to-secondary';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Investment Plan Selected - GNF Invest</title>
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
        .plan-card {
          background: linear-gradient(to right, #0D9488, #F59E0B);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .plan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .plan-name {
          font-size: 22px;
          font-weight: bold;
          margin: 0;
        }
        .plan-amount {
          font-size: 20px;
          font-weight: bold;
        }
        .plan-details {
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
        <h1>Your Investment Plan is Ready!</h1>
      </div>
      
      <div class="content">
        <p>Dear ${user.firstName},</p>
        
        <p>Thank you for selecting the <span class="highlight">${planData.type}</span> investment plan with GNF Invest. We're excited to help you grow your wealth!</p>
        
        <div class="plan-card">
          <div class="plan-header">
            <h2 class="plan-name">${planData.type}</h2>
            <div class="plan-amount">$${planData.amount}</div>
          </div>
          
          <div class="plan-details">
            <div class="detail-row">
              <span class="detail-label">Expected ROI:</span>
              <span>${planData.roi}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Withdrawal Period:</span>
              <span>${planData.withdrawalPeriod}</span>
            </div>
            ${planInfo ? `
            <div class="detail-row">
              <span class="detail-label">Plan Features:</span>
              <span></span>
            </div>
            <ul style="margin-top: 5px; padding-left: 20px;">
              ${planInfo.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            ` : ''}
          </div>
        </div>
        
        <div class="next-steps">
          <h3 style="margin-top: 0;">Next Steps:</h3>
          <ol>
            <li>Complete your payment to activate the plan</li>
            <li>Monitor your investment dashboard for updates</li>
            <li>Receive your first returns in ${planData.withdrawalPeriod}</li>
          </ol>
        </div>
        
        <p>To complete your investment and activate your plan, please proceed with the payment:</p>
        
        <div style="text-align: center;">
          <a href="https://gnfinvest.com/complete-payment/${planData._id}" class="button">Complete Payment Now</a>
        </div>
        
        <p>If you have any questions about your investment plan, our team is available 24/7 at <span class="highlight">support@gnfinvest.com</span>.</p>
        
        <p>We're committed to helping you achieve your financial goals through our innovative investment strategies.</p>
      </div>
      
      <div class="footer">
        <p>© 2023 GNF Invest. All rights reserved.</p>
        <p>This email confirms your investment plan selection. Your plan will be activated upon payment confirmation.</p>
      </div>
    </body>
    </html>
  `;
}

function getPaymentConfirmedEmailHTML(user, planData) {
  const planInfo = investmentPlans.find(p => p.name === planData.type);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Confirmed - GNF Invest</title>
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
        .success-card {
          background-color: #e6f7f6;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #0D9488;
          text-align: center;
        }
        .checkmark {
          font-size: 48px;
          color: #0D9488;
          margin-bottom: 15px;
        }
        .plan-summary {
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
        <div class="success-card">
          <div class="checkmark">✓</div>
          <h2 style="margin-top: 0;">Payment Confirmed!</h2>
          <p>Your investment in the <span class="highlight">${planData.type}</span> plan is now active.</p>
        </div>
        
        <p>Dear ${user.firstName},</p>
        
        <p>We're pleased to inform you that your payment of <span class="highlight">$${planData.amount}</span> has been successfully processed, and your investment plan is now active.</p>
        
        <div class="plan-summary">
          <h3 style="margin-top: 0;">Investment Details:</h3>
          <div class="detail-row">
            <span class="detail-label">Plan Type:</span>
            <span>${planData.type}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Investment Amount:</span>
            <span>$${planData.amount}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Expected ROI:</span>
            <span>${planData.roi}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Withdrawal Period:</span>
            <span>${planData.withdrawalPeriod}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Activation Date:</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <p>What to expect next:</p>
        <ul>
          <li>Your investment will begin generating returns immediately</li>
          <li>You'll receive regular performance updates</li>
          <li>Your first withdrawal will be available in ${planData.withdrawalPeriod}</li>
        </ul>
        
        <div style="text-align: center;">
          <a href="https://gnfinvest.com/dashboard" class="button">View Your Dashboard</a>
        </div>
        
        <p>Our team is monitoring your investment and will ensure it performs according to our high standards. If you have any questions, please contact us at <span class="highlight">support@gnfinvest.com</span>.</p>
        
        <p>Thank you for trusting GNF Invest with your financial future!</p>
      </div>
      
      <div class="footer">
        <p>© 2023 GNF Invest. All rights reserved.</p>
        <p>This email confirms your successful payment and plan activation. Please keep it for your records.</p>
      </div>
    </body>
    </html>
  `;
}

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

    // Send plan selected email
    const user = await User.findById(req.user._id);
    const mailOptions = {
      from: '"GNF Invest" <fincch@zohomail.com>',
      to: user.email,
      subject: `Your ${type} Investment Plan is Ready - Complete Payment`,
      html: getPlanSelectedEmailHTML(user, { ...plan.toObject(), _id: plan._id }),
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json({ plan, transaction });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' });
  }
});

// Simulate payment confirmation (updated with email)
router.post('/confirm-payment/:planId', authMiddleware, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.planId);
    if (!plan || plan.user.toString() !== req.user._id) {
        console.log('Plan not found')
      return res.status(404).json({ message: 'Plan not found' });
    }

    plan.status = 'Active';
    await plan.save();

    const transaction = await Transaction.findOne({ plan: plan._id, type: 'Plan Activation' });
    transaction.status = 'Completed';
    await transaction.save();

    // Send payment confirmed email
    const user = await User.findById(req.user._id);
    const mailOptions = {
      from: '"GNF Invest" <fincch@zohomail.com>',
      to: user.email,
      subject: `Payment Confirmed - Your ${plan.type} Plan is Now Active!`,
      html: getPaymentConfirmedEmailHTML(user, plan),
    };
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Payment confirmed', plan });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;