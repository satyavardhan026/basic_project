const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Middleware to check if user is authenticated
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'infinity-bank-secret-key';
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

// Get user profile
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

// Update user profile
router.patch('/profile', authenticateToken, [
  body('mobile')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be 10 digits'),
  body('creditCard.cardHolder')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Credit card holder name cannot be empty'),
  body('debitCard.cardHolder')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Debit card holder name cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { mobile, creditCard, debitCard } = req.body;

    // Check if mobile number is already taken by another user
    if (mobile && mobile !== req.user.mobile) {
      const existingUser = await User.findOne({ mobile });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Mobile number already exists' 
        });
      }
      req.user.mobile = mobile;
    }

    // Update credit card holder name if provided
    if (creditCard && creditCard.cardHolder) {
      req.user.creditCard.cardHolder = creditCard.cardHolder;
    }

    // Update debit card holder name if provided
    if (debitCard && debitCard.cardHolder) {
      req.user.debitCard.cardHolder = debitCard.cardHolder;
    }

    await req.user.save();

    res.json({
      message: 'Profile updated successfully',
      user: req.user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error while updating profile' 
    });
  }
});

// Get account balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    res.json({
      accountBalance: req.user.accountBalance,
      accountNumber: req.user.accountNumber,
      currency: 'INR'
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching balance' 
    });
  }
});

// Get account summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = {
      accountNumber: req.user.accountNumber,
      accountBalance: req.user.accountBalance,
      username: req.user.username,
      mobile: req.user.mobile,
      accountStatus: req.user.isActive ? 'Active' : 'Inactive',
      memberSince: req.user.createdAt,
      lastLogin: req.user.lastLogin,
      currency: 'INR'
    };

    res.json({ summary });
  } catch (error) {
    console.error('Get account summary error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching account summary' 
    });
  }
});

// UPI Integration - Link bank account
router.post('/upi/link', authenticateToken, [
  body('upiId')
    .matches(/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/)
    .withMessage('Invalid UPI ID format. Use format: username@bankname'),
  body('bankName')
    .notEmpty()
    .withMessage('Bank name is required'),
  body('accountNumber')
    .matches(/^[0-9]{9,18}$/)
    .withMessage('Account number must be between 9 and 18 digits'),
  body('ifscCode')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Invalid IFSC code format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { upiId, bankName, accountNumber, ifscCode } = req.body;

    // Check if UPI ID is already linked
    const existingUPI = await User.findOne({ 
      'upiDetails.upiId': upiId,
      _id: { $ne: req.user._id }
    });

    if (existingUPI) {
      return res.status(400).json({ 
        message: 'UPI ID is already linked to another account' 
      });
    }

    // Add UPI details to user
    if (!req.user.upiDetails) {
      req.user.upiDetails = [];
    }

    req.user.upiDetails.push({
      upiId,
      bankName,
      accountNumber,
      ifscCode,
      isActive: true,
      linkedAt: new Date()
    });

    await req.user.save();

    res.json({
      message: 'UPI account linked successfully',
      upiDetails: {
        upiId,
        bankName,
        accountNumber: accountNumber.substring(accountNumber.length - 4), // Show only last 4 digits
        ifscCode,
        isActive: true,
        linkedAt: req.user.upiDetails[req.user.upiDetails.length - 1].linkedAt
      }
    });

  } catch (error) {
    console.error('Link UPI error:', error);
    res.status(500).json({ 
      message: 'Internal server error while linking UPI account' 
    });
  }
});

// Get linked UPI accounts
router.get('/upi/accounts', authenticateToken, async (req, res) => {
  try {
    const upiAccounts = req.user.upiDetails || [];

    // Mask account numbers for security
    const maskedAccounts = upiAccounts.map(account => ({
      id: account._id,
      upiId: account.upiId,
      bankName: account.bankName,
      accountNumber: account.accountNumber.substring(account.accountNumber.length - 4),
      ifscCode: account.ifscCode,
      isActive: account.isActive,
      linkedAt: account.linkedAt
    }));

    res.json({ upiAccounts: maskedAccounts });
  } catch (error) {
    console.error('Get UPI accounts error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching UPI accounts' 
    });
  }
});

// Unlink UPI account
router.delete('/upi/unlink/:upiId', authenticateToken, async (req, res) => {
  try {
    const { upiId } = req.params;

    if (!req.user.upiDetails) {
      return res.status(404).json({ 
        message: 'No UPI accounts found' 
      });
    }

    const upiIndex = req.user.upiDetails.findIndex(
      account => account.upiId === upiId
    );

    if (upiIndex === -1) {
      return res.status(404).json({ 
        message: 'UPI account not found' 
      });
    }

    // Remove UPI account
    req.user.upiDetails.splice(upiIndex, 1);
    await req.user.save();

    res.json({
      message: 'UPI account unlinked successfully'
    });

  } catch (error) {
    console.error('Unlink UPI error:', error);
    res.status(500).json({ 
      message: 'Internal server error while unlinking UPI account' 
    });
  }
});

// Toggle UPI account status
router.patch('/upi/toggle/:upiId', authenticateToken, [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { upiId } = req.params;
    const { isActive } = req.body;

    if (!req.user.upiDetails) {
      return res.status(404).json({ 
        message: 'No UPI accounts found' 
      });
    }

    const upiAccount = req.user.upiDetails.find(
      account => account.upiId === upiId
    );

    if (!upiAccount) {
      return res.status(404).json({ 
        message: 'UPI account not found' 
      });
    }

    // Update UPI account status
    upiAccount.isActive = isActive;
    await req.user.save();

    res.json({
      message: `UPI account ${isActive ? 'activated' : 'deactivated'} successfully`,
      upiAccount: {
        upiId: upiAccount.upiId,
        isActive: upiAccount.isActive
      }
    });

  } catch (error) {
    console.error('Toggle UPI status error:', error);
    res.status(500).json({ 
      message: 'Internal server error while updating UPI account status' 
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {
      accountAge: Math.floor((Date.now() - req.user.createdAt) / (1000 * 60 * 60 * 24)),
      totalLogins: req.user.lastLogin ? 1 : 0, // Simplified - in real app, track login count
      accountStatus: req.user.isActive ? 'Active' : 'Inactive',
      linkedUPIAccounts: req.user.upiDetails ? req.user.upiDetails.length : 0,
      activeUPIAccounts: req.user.upiDetails ? req.user.upiDetails.filter(upi => upi.isActive).length : 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching user statistics' 
    });
  }
});

// Deactivate account
router.patch('/deactivate', authenticateToken, [
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Reason must be less than 200 characters')
], async (req, res) => {
  try {
    const { reason } = req.body;

    // Deactivate user account
    req.user.isActive = false;
    if (reason) {
      req.user.deactivationReason = reason;
      req.user.deactivatedAt = new Date();
    }

    await req.user.save();

    res.json({
      message: 'Account deactivated successfully',
      deactivatedAt: req.user.deactivatedAt
    });

  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ 
      message: 'Internal server error while deactivating account' 
    });
  }
});

module.exports = router;
