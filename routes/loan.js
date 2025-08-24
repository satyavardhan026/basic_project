const express = require('express');
const { body, validationResult } = require('express-validator');
const Loan = require('../models/Loan');
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

// Apply for a loan
router.post('/apply', authenticateToken, [
  body('loanType')
    .isIn(['personal', 'home', 'business', 'education', 'vehicle'])
    .withMessage('Invalid loan type'),
  body('amount')
    .isFloat({ min: 1000 })
    .withMessage('Loan amount must be at least ₹1,000'),
  body('term')
    .isInt({ min: 1, max: 360 })
    .withMessage('Loan term must be between 1 and 360 months'),
  body('purpose')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Purpose must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { loanType, amount, term, purpose } = req.body;

    // Calculate interest rate based on loan type and amount
    let interestRate = 0;
    switch (loanType) {
      case 'personal':
        interestRate = amount >= 50000 ? 10.5 : 12.5;
        break;
      case 'home':
        interestRate = amount >= 1000000 ? 8.5 : 9.5;
        break;
      case 'business':
        interestRate = amount >= 200000 ? 11.5 : 13.5;
        break;
      case 'education':
        interestRate = 9.5;
        break;
      case 'vehicle':
        interestRate = amount >= 500000 ? 9.0 : 10.5;
        break;
    }

    // Check if user has any existing active loans
    const existingLoan = await Loan.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'approved', 'active'] }
    });

    if (existingLoan) {
      return res.status(400).json({ 
        message: 'You already have an active loan application or loan' 
      });
    }

    // Create loan application
    const loan = new Loan({
      user: req.user._id,
      loanType,
      amount,
      interestRate,
      term,
      purpose
    });

    await loan.save();

    res.status(201).json({
      message: 'Loan application submitted successfully',
      loan: {
        id: loan._id,
        loanType: loan.loanType,
        amount: loan.amount,
        interestRate: loan.interestRate,
        term: loan.term,
        monthlyPayment: loan.monthlyPayment,
        totalAmount: loan.totalAmount,
        status: loan.status,
        createdAt: loan.createdAt
      }
    });

  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({ 
      message: 'Internal server error while submitting loan application' 
    });
  }
});

// Get user's loan applications
router.get('/my-loans', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user._id };
    if (status) query.status = status;

    // Get loans
    const loans = await Loan.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Loan.countDocuments(query);

    res.json({
      loans,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLoans: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get my loans error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching loans' 
    });
  }
});

// Get loan by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ 
        message: 'Loan not found' 
      });
    }

    // Check if user owns this loan
    if (loan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this loan' 
      });
    }

    res.json({ loan });

  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching loan' 
    });
  }
});

// Update loan application
router.patch('/:id', authenticateToken, [
  body('purpose')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Purpose must be less than 200 characters'),
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ 
        message: 'Loan not found' 
      });
    }

    // Check if user owns this loan
    if (loan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this loan' 
      });
    }

    // Check if loan can be updated
    if (loan.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Only pending loans can be updated' 
      });
    }

    // Update allowed fields
    const { purpose, documents } = req.body;
    if (purpose) loan.purpose = purpose;
    if (documents) loan.documents = documents;

    await loan.save();

    res.json({ 
      message: 'Loan updated successfully',
      loan: {
        id: loan._id,
        purpose: loan.purpose,
        documents: loan.documents,
        updatedAt: loan.updatedAt
      }
    });

  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({ 
      message: 'Internal server error while updating loan' 
    });
  }
});

// Cancel loan application
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ 
        message: 'Loan not found' 
      });
    }

    // Check if user owns this loan
    if (loan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this loan' 
      });
    }

    // Check if loan can be cancelled
    if (loan.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Only pending loans can be cancelled' 
      });
    }

    // Update loan status
    loan.status = 'cancelled';
    await loan.save();

    res.json({ 
      message: 'Loan application cancelled successfully',
      loan: {
        id: loan._id,
        status: loan.status,
        updatedAt: loan.updatedAt
      }
    });

  } catch (error) {
    console.error('Cancel loan error:', error);
    res.status(500).json({ 
      message: 'Internal server error while cancelling loan' 
    });
  }
});

// Get loan calculator
router.post('/calculator', [
  body('amount')
    .isFloat({ min: 1000 })
    .withMessage('Loan amount must be at least ₹1,000'),
  body('term')
    .isInt({ min: 1, max: 360 })
    .withMessage('Loan term must be between 1 and 360 months'),
  body('interestRate')
    .isFloat({ min: 0.1, max: 25 })
    .withMessage('Interest rate must be between 0.1% and 25%')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { amount, term, interestRate } = req.body;

    // Calculate monthly payment
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = term;
    
    let monthlyPayment = 0;
    if (monthlyRate > 0) {
      monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                       (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    } else {
      monthlyPayment = amount / numberOfPayments;
    }

    const totalAmount = monthlyPayment * numberOfPayments;
    const totalInterest = totalAmount - amount;

    res.json({
      calculation: {
        loanAmount: amount,
        term: term,
        interestRate: interestRate,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100
      }
    });

  } catch (error) {
    console.error('Loan calculator error:', error);
    res.status(500).json({ 
      message: 'Internal server error while calculating loan' 
    });
  }
});

// Get loan statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get total loans
    const totalLoans = await Loan.countDocuments({ user: userId });

    // Get loans by status
    const loansByStatus = await Loan.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get loans by type
    const loansByType = await Loan.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$loanType', count: { $sum: 1 } } }
    ]);

    // Get total loan amount
    const totalLoanAmount = await Loan.aggregate([
      { $match: { user: userId, status: { $in: ['approved', 'active'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      summary: {
        totalLoans,
        totalLoanAmount: totalLoanAmount[0]?.total || 0
      },
      loansByStatus,
      loansByType
    });

  } catch (error) {
    console.error('Get loan stats error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching loan statistics' 
    });
  }
});

module.exports = router;
