const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

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

// Updated signup route
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

    // HTML Welcome Email Template
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
        <!-- Header -->
        <div style="background-color: #0D9488; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to GNF!</h1>
        </div>

        <!-- Body -->
        <div style="padding: 25px;">
          <p>Hi ${firstName},</p>
          <p>Thank you for joining GNF! We're thrilled to have you with us.</p>
          
          <div style="margin: 25px 0;">
            <a href="#" style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
              Access Your Account
            </a>
          </div>

          <!-- Contact Section -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Contact Us</h3>
            <p style="color: #666; margin-bottom: 8px;">123 Street, Finance City, FC 12345</p>
            <p style="color: #666; margin-bottom: 8px;">Phone: +1 (555) 123-4567</p>
            <p style="color: #666; margin-bottom: 0;">Email: support@gnf.com</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
          © ${new Date().getFullYear()} GNF. All rights reserved.
        </div>
      </div>
    `;

    // Send welcome email
    const mailOptions = {
      from: `GNF <${process.env.Zoho_User}>`,
      to: email,
      subject: "Welcome to GNF!",
      html: htmlTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    // Generate JWT
    const payload = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Updated login route
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

    // Send login notification email
    const now = new Date();
    const formattedDate = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const securityMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; background-color: #f9f9f9;">
        <h3 style="color: #0D9488; margin-top: 0;">Security Notice</h3>
        <p>For your protection:</p>
        <ul style="padding-left: 20px; color: #555;">
          <li>This login occurred on <strong>${formattedDate}</strong></li>
          <li>If this wasn't you, <a href="#" style="color: #F59E0B;">secure your account immediately</a></li>
          <li>Never share your credentials</li>
        </ul>
      </div>
    `;

    const mailOptions = {
      from: `GNF Security <${process.env.Zoho_User}>`,
      to: user.email,
      subject: 'New Login Detected - GNF Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0D9488; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">New Login Detected</h1>
          </div>
          
          <div style="padding: 25px;">
            <p>Hello ${user.firstName || user.username},</p>
            <p>We detected a login to your GNF account:</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>Account:</strong> ${user.email}</p>
            </div>
            
            ${securityMessage}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Contact Us</h3>
              <p style="color: #666; margin-bottom: 8px;">123 Street, Finance City, FC 12345</p>
              <p style="color: #666; margin-bottom: 8px;">Phone: +1 (555) 123-4567</p>
              <p style="color: #666; margin-bottom: 0;">Email: support@gnf.com</p>
            </div>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} GNF. All rights reserved.
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending login alert:', error);
      } else {
        console.log('Login alert sent:', info.response);
      }
    });

    // Generate JWT
    const payload = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: payload,
      message: "Login successful. Check your email for security details."
    });
  } catch (error) {
    console.error('Login error:', error);
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