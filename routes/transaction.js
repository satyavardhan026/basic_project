const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
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

// Create a new transaction
router.post('/create', authenticateToken, [
  body('receiverId')
    .isMongoId()
    .withMessage('Valid receiver ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('type')
    .isIn(['transfer', 'deposit', 'withdrawal', 'payment'])
    .withMessage('Invalid transaction type'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { receiverId, amount, type, description } = req.body;
    const senderId = req.user._id;

    // Check if sender has sufficient balance
    if (type === 'transfer' && req.user.accountBalance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient balance' 
      });
    }

    // Find receiver
    const receiver = await User.findById(receiverId);
    if (!receiver || !receiver.isActive) {
      return res.status(404).json({ 
        message: 'Receiver not found' 
      });
    }

    // Create transaction
    const transaction = new Transaction({
      sender: senderId,
      receiver: receiverId,
      amount,
      type,
      description,
      status: 'pending'
    });

    await transaction.save();

    // Process transaction based on type
    if (type === 'transfer') {
      // Deduct from sender
      req.user.accountBalance -= amount;
      await req.user.save();

      // Add to receiver
      receiver.accountBalance += amount;
      await receiver.save();

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();
    } else if (type === 'deposit') {
      // Add to sender's account
      req.user.accountBalance += amount;
      await req.user.save();

      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();
    } else if (type === 'withdrawal') {
      // Check if user has sufficient balance
      if (req.user.accountBalance < amount) {
        return res.status(400).json({ 
          message: 'Insufficient balance for withdrawal' 
        });
      }

      // Deduct from sender
      req.user.accountBalance -= amount;
      await req.user.save();

      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();
    }

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: {
        id: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ 
      message: 'Internal server error while creating transaction' 
    });
  }
});

// Get transaction history for user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id }
      ]
    };

    if (type) query.type = type;
    if (status) query.status = status;

    // Get transactions
    const transactions = await Transaction.find(query)
      .populate('sender', 'username accountNumber')
      .populate('receiver', 'username accountNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching transaction history' 
    });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('sender', 'username accountNumber')
      .populate('receiver', 'username accountNumber');

    if (!transaction) {
      return res.status(404).json({ 
        message: 'Transaction not found' 
      });
    }

    // Check if user is part of this transaction
    if (transaction.sender._id.toString() !== req.user._id.toString() && 
        transaction.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this transaction' 
      });
    }

    res.json({ transaction });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching transaction' 
    });
  }
});

// Cancel pending transaction
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ 
        message: 'Transaction not found' 
      });
    }

    // Check if user is the sender
    if (transaction.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Only sender can cancel transaction' 
      });
    }

    // Check if transaction can be cancelled
    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Only pending transactions can be cancelled' 
      });
    }

    // Update transaction status
    transaction.status = 'cancelled';
    await transaction.save();

    res.json({ 
      message: 'Transaction cancelled successfully',
      transaction: {
        id: transaction._id,
        status: transaction.status,
        updatedAt: transaction.updatedAt
      }
    });

  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ 
      message: 'Internal server error while cancelling transaction' 
    });
  }
});

// Get transaction statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get total transactions
    const totalTransactions = await Transaction.countDocuments({
      $or: [{ sender: userId }, { receiver: userId }]
    });

    // Get total amount sent
    const totalSent = await Transaction.aggregate([
      { $match: { sender: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get total amount received
    const totalReceived = await Transaction.aggregate([
      { $match: { receiver: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get transactions by type
    const transactionsByType = await Transaction.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get transactions by status
    const transactionsByStatus = await Transaction.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      summary: {
        totalTransactions,
        totalSent: totalSent[0]?.total || 0,
        totalReceived: totalReceived[0]?.total || 0,
        currentBalance: req.user.accountBalance
      },
      transactionsByType,
      transactionsByStatus
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching transaction statistics' 
    });
  }
});

module.exports = router;
