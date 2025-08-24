const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../mongodb models/User');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'infinity-bank-secret-key';

// Middleware to check if user is authenticated
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// User Registration
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('mobile')
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be 10 digits'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  body('creditCard.cardNumber')
    .matches(/^[0-9]{16}$/)
    .withMessage('Credit card number must be 16 digits'),
  body('creditCard.cardHolder')
    .notEmpty()
    .withMessage('Credit card holder name is required'),
  body('creditCard.expiryDate')
    .matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
    .withMessage('Credit card expiry date must be in MM/YY format'),
  body('creditCard.cvv')
    .matches(/^[0-9]{3,4}$/)
    .withMessage('Credit card CVV must be 3 or 4 digits'),
  body('debitCard.cardNumber')
    .matches(/^[0-9]{16}$/)
    .withMessage('Debit card number must be 16 digits'),
  body('debitCard.cardHolder')
    .notEmpty()
    .withMessage('Debit card holder name is required'),
  body('debitCard.expiryDate')
    .matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
    .withMessage('Debit card expiry date must be in MM/YY format'),
  body('debitCard.cvv')
    .matches(/^[0-9]{3,4}$/)
    .withMessage('Debit card CVV must be 3 or 4 digits')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, mobile, password, creditCard, debitCard } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { mobile }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username or mobile number already exists' 
      });
    }

    // Create new user
    const user = new User({
      username,
      mobile,
      password,
      creditCard,
      debitCard
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error during registration' 
    });
  }
});

// User Login
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid username or password' 
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error during login' 
    });
  }
});

// Forgot Password
router.post('/forgot-password', [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('mobile')
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be 10 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, mobile } = req.body;

    // Find user
    const user = await User.findOne({ username, mobile, isActive: true });
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found with provided credentials' 
      });
    }

    // Generate temporary password (in real app, send SMS/email)
    const tempPassword = Math.random().toString(36).substr(2, 8);
    user.password = tempPassword;
    await user.save();

    res.json({
      message: 'Temporary password generated successfully',
      tempPassword // In production, send this via SMS/email
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Internal server error during password reset' 
    });
  }
});

// Change Password
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password confirmation does not match');
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Internal server error during password change' 
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching profile' 
    });
  }
});

module.exports = router;
