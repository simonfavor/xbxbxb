const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

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



// Email template functions
function getWelcomeEmailHTML(firstName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Welcome to GNF Invest</title>
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
        .investment-card {
          background: linear-gradient(to right, #0D9488, #F59E0B);
          color: white;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .investment-card h3 {
          margin-top: 0;
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
        <h1>Welcome to GNF Invest, ${firstName}!</h1>
      </div>
      
      <div class="content">
        <p>We're thrilled to have you join our community of forward-thinking investors. At GNF Invest, we're not just financial advisors – we're architects of prosperity, dedicated to building wealth and security for our clients through innovative investment strategies.</p>
        
        <p>Your account has been successfully created, and you're now ready to embark on your journey to financial freedom.</p>
        
        <div class="investment-card">
          <h3>Why Choose GNF Invest?</h3>
          <ul>
            <li>$12+ billion in assets under management</li>
            <li>25,000+ satisfied clients worldwide</li>
            <li>18% average annual client returns</li>
            <li>Offices in 12 countries across 4 continents</li>
          </ul>
        </div>
        
        <p>To get started, explore our investment plans tailored to help you achieve your financial goals:</p>
        
        <div style="text-align: center;">
          <a href="https://gnfinvest.com/dashboard" class="button">Start Investing Now</a>
        </div>
        
        <p>Our team is committed to providing you with transparent, innovative, and personalized investment solutions that consistently outperform market expectations.</p>
        
        <p>If you have any questions or need assistance, don't hesitate to reach out to our support team at <span class="highlight">support@gnfinvest.com</span>.</p>
      </div>
      
      <div class="footer">
        <p>© 2023 GNF Invest. All rights reserved.</p>
        <p>This email was sent to you as part of your GNF Invest membership. To unsubscribe from these emails, please update your account settings.</p>
      </div>
    </body>
    </html>
  `;
}

function getLoginNotificationEmailHTML(firstName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Login Notification</title>
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
        .security-tips {
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
        <h2>Security Notification</h2>
      </div>
      
      <div class="content">
        <p>Hello ${firstName},</p>
        
        <p>We're letting you know that there was a successful login to your GNF Invest account just now.</p>
        
        <div class="security-tips">
          <h3 style="margin-top: 0;">Security Tips:</h3>
          <ul>
            <li>Never share your password with anyone</li>
            <li>Enable two-factor authentication for extra security</li>
            <li>Regularly update your password</li>
            <li>Contact us immediately if you didn't initiate this login</li>
          </ul>
        </div>
        
        <p>If this was you, no further action is required. If you don't recognize this activity, please secure your account immediately by changing your password and contacting our security team at <span class="highlight">security@gnfinvest.com</span>.</p>
        
        <div style="text-align: center;">
          <a href="https://gnfinvest.com/account/security" class="button">Review Account Security</a>
        </div>
        
        <p>At GNF Invest, we take your account security seriously. Our team works around the clock to protect your investments and personal information.</p>
      </div>
      
      <div class="footer">
        <p>© 2023 GNF Invest. All rights reserved.</p>
        <p>This email was sent for your security. You cannot unsubscribe from security notifications.</p>
      </div>
    </body>
    </html>
  `;
}

// Signup with email
router.post('/signup', async (req, res) => {
  const {
    username,
    firstName,
    lastName,
    dob,
    address,
    phone,
    email,
    country,
    password,
  } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    user = new User({
      username,
      firstName,
      lastName,
      dob,
      address,
      phone,
      email,
      country,
      password,
    });

    await user.save();

    // Generate JWT
    const payload = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Send welcome email
    const mailOptions = {
      from: '"GNF Invest" <fincch@zohomail.com>',
      to: email,
      subject: 'Welcome to GNF Invest - Your Journey to Financial Freedom Begins!',
      html: getWelcomeEmailHTML(firstName),
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ token, user });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' });
  }
});

// Login with email notification
router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Send login notification email
    const mailOptions = {
      from: '"GNF Invest" <fincch@zohomail.com>',
      to: user.email,
      subject: 'Security Notice: Successful Login to Your GNF Invest Account',
      html: getLoginNotificationEmailHTML(user.firstName),
    };

    await transporter.sendMail(mailOptions);

    res.json({ token, user: payload });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// Protected route: Get user details
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;