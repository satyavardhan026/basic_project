const express = require('express');
const { body, validationResult } = require('express-validator');
const Card = require('../models/Card');
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

// Apply for a new card
router.post('/apply', authenticateToken, [
  body('cardType')
    .isIn(['credit', 'debit'])
    .withMessage('Card type must be either credit or debit'),
  body('cardNetwork')
    .isIn(['Visa', 'Mastercard', 'RuPay', 'American Express'])
    .withMessage('Invalid card network'),
  body('cardCategory')
    .isIn(['classic', 'gold', 'platinum', 'signature', 'infinite'])
    .withMessage('Invalid card category'),
  body('creditLimit')
    .if(body('cardType').equals('credit'))
    .isFloat({ min: 10000, max: 1000000 })
    .withMessage('Credit limit must be between ₹10,000 and ₹10,00,000'),
  body('pin')
    .matches(/^[0-9]{4}$/)
    .withMessage('PIN must be exactly 4 digits'),
  body('isContactless')
    .optional()
    .isBoolean()
    .withMessage('isContactless must be a boolean'),
  body('isInternational')
    .optional()
    .isBoolean()
    .withMessage('isInternational must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { 
      cardType, 
      cardNetwork, 
      cardCategory, 
      creditLimit, 
      pin, 
      isContactless = true, 
      isInternational = false 
    } = req.body;

    // Check if user already has a card of this type
    const existingCard = await Card.findOne({
      user: req.user._id,
      cardType,
      status: { $in: ['pending', 'approved', 'active'] }
    });

    if (existingCard) {
      return res.status(400).json({ 
        message: `You already have a ${cardType} card application or active card` 
      });
    }

    // Calculate annual fee based on card category
    let annualFee = 0;
    switch (cardCategory) {
      case 'classic':
        annualFee = cardType === 'credit' ? 500 : 0;
        break;
      case 'gold':
        annualFee = cardType === 'credit' ? 1000 : 250;
        break;
      case 'platinum':
        annualFee = cardType === 'credit' ? 2500 : 500;
        break;
      case 'signature':
        annualFee = cardType === 'credit' ? 5000 : 1000;
        break;
      case 'infinite':
        annualFee = cardType === 'credit' ? 10000 : 2000;
        break;
    }

    // Determine rewards program
    let rewardsProgram = 'none';
    if (cardType === 'credit') {
      switch (cardCategory) {
        case 'gold':
          rewardsProgram = 'cashback';
          break;
        case 'platinum':
          rewardsProgram = 'points';
          break;
        case 'signature':
        case 'infinite':
          rewardsProgram = 'miles';
          break;
      }
    }

    // Create card application
    const card = new Card({
      user: req.user._id,
      cardType,
      cardNetwork,
      cardCategory,
      creditLimit: cardType === 'credit' ? creditLimit : 0,
      availableCredit: cardType === 'credit' ? creditLimit : 0,
      pin,
      annualFee,
      rewardsProgram,
      isContactless,
      isInternational
    });

    await card.save();

    res.status(201).json({
      message: 'Card application submitted successfully',
      card: {
        id: card._id,
        cardType: card.cardType,
        cardNetwork: card.cardNetwork,
        cardCategory: card.cardCategory,
        creditLimit: card.creditLimit,
        annualFee: card.annualFee,
        rewardsProgram: card.rewardsProgram,
        status: card.status,
        createdAt: card.createdAt
      }
    });

  } catch (error) {
    console.error('Card application error:', error);
    res.status(500).json({ 
      message: 'Internal server error while submitting card application' 
    });
  }
});

// Get user's cards
router.get('/my-cards', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, cardType, status } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user._id };
    if (cardType) query.cardType = cardType;
    if (status) query.status = status;

    // Get cards
    const cards = await Card.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Card.countDocuments(query);

    res.json({
      cards: cards.map(card => card.getPublicInfo()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalCards: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get my cards error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching cards' 
    });
  }
});

// Get card by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ 
        message: 'Card not found' 
      });
    }

    // Check if user owns this card
    if (card.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this card' 
      });
    }

    res.json({ 
      card: card.getPublicInfo() 
    });

  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching card' 
    });
  }
});

// Update card application
router.patch('/:id', authenticateToken, [
  body('isContactless')
    .optional()
    .isBoolean()
    .withMessage('isContactless must be a boolean'),
  body('isInternational')
    .optional()
    .isBoolean()
    .withMessage('isInternational must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ 
        message: 'Card not found' 
      });
    }

    // Check if user owns this card
    if (card.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this card' 
      });
    }

    // Check if card can be updated
    if (card.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Only pending cards can be updated' 
      });
    }

    // Update allowed fields
    const { isContactless, isInternational } = req.body;
    if (isContactless !== undefined) card.isContactless = isContactless;
    if (isInternational !== undefined) card.isInternational = isInternational;

    await card.save();

    res.json({ 
      message: 'Card updated successfully',
      card: {
        id: card._id,
        isContactless: card.isContactless,
        isInternational: card.isInternational,
        updatedAt: card.updatedAt
      }
    });

  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ 
      message: 'Internal server error while updating card' 
    });
  }
});

// Cancel card application
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ 
        message: 'Card not found' 
      });
    }

    // Check if user owns this card
    if (card.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this card' 
      });
    }

    // Check if card can be cancelled
    if (card.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Only pending cards can be cancelled' 
      });
    }

    // Update card status
    card.status = 'cancelled';
    await card.save();

    res.json({ 
      message: 'Card application cancelled successfully',
      card: {
        id: card._id,
        status: card.status,
        updatedAt: card.updatedAt
      }
    });

  } catch (error) {
    console.error('Cancel card error:', error);
    res.status(500).json({ 
      message: 'Internal server error while cancelling card' 
    });
  }
});

// Block/Unblock card
router.patch('/:id/toggle-status', authenticateToken, [
  body('action')
    .isIn(['block', 'unblock'])
    .withMessage('Action must be either block or unblock')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { action } = req.body;
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ 
        message: 'Card not found' 
      });
    }

    // Check if user owns this card
    if (card.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied to this card' 
      });
    }

    // Check if card is active
    if (card.status !== 'active') {
      return res.status(400).json({ 
        message: 'Only active cards can be blocked/unblocked' 
      });
    }

    // Update card status
    card.status = action === 'block' ? 'blocked' : 'active';
    await card.save();

    res.json({ 
      message: `Card ${action}ed successfully`,
      card: {
        id: card._id,
        status: card.status,
        updatedAt: card.updatedAt
      }
    });

  } catch (error) {
    console.error('Toggle card status error:', error);
    res.status(500).json({ 
      message: 'Internal server error while updating card status' 
    });
  }
});

// Get card statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get total cards
    const totalCards = await Card.countDocuments({ user: userId });

    // Get cards by type
    const cardsByType = await Card.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$cardType', count: { $sum: 1 } } }
    ]);

    // Get cards by status
    const cardsByStatus = await Card.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get cards by network
    const cardsByNetwork = await Card.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$cardNetwork', count: { $sum: 1 } } }
    ]);

    // Get total credit limit
    const totalCreditLimit = await Card.aggregate([
      { $match: { user: userId, cardType: 'credit', status: 'active' } },
      { $group: { _id: null, total: { $sum: '$creditLimit' } } }
    ]);

    res.json({
      summary: {
        totalCards,
        totalCreditLimit: totalCreditLimit[0]?.total || 0
      },
      cardsByType,
      cardsByStatus,
      cardsByNetwork
    });

  } catch (error) {
    console.error('Get card stats error:', error);
    res.status(500).json({ 
      message: 'Internal server error while fetching card statistics' 
    });
  }
});

module.exports = router;
