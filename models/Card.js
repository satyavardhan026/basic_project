const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardType: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  cardNumber: {
    type: String,
    unique: true,
    required: true,
    match: /^[0-9]{16}$/
  },
  cardHolder: {
    type: String,
    required: true,
    trim: true
  },
  expiryDate: {
    type: String,
    required: true,
    match: /^(0[1-9]|1[0-2])\/([0-9]{2})$/
  },
  cvv: {
    type: String,
    required: true,
    match: /^[0-9]{3,4}$/
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'blocked', 'expired'],
    default: 'pending'
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  availableCredit: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  },
  minimumPayment: {
    type: Number,
    default: 0
  },
  cardNetwork: {
    type: String,
    enum: ['Visa', 'Mastercard', 'RuPay', 'American Express'],
    required: true
  },
  cardCategory: {
    type: String,
    enum: ['classic', 'gold', 'platinum', 'signature', 'infinite'],
    default: 'classic'
  },
  annualFee: {
    type: Number,
    default: 0
  },
  rewardsProgram: {
    type: String,
    enum: ['cashback', 'points', 'miles', 'none'],
    default: 'none'
  },
  isContactless: {
    type: Boolean,
    default: true
  },
  isInternational: {
    type: Boolean,
    default: false
  },
  pin: {
    type: String,
    required: true,
    match: /^[0-9]{4}$/
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  issuedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
cardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate card number if not provided
cardSchema.pre('save', function(next) {
  if (!this.cardNumber) {
    const prefix = this.cardNetwork === 'Visa' ? '4' : 
                   this.cardNetwork === 'Mastercard' ? '5' : 
                   this.cardNetwork === 'RuPay' ? '6' : '3';
    
    let cardNumber = prefix;
    for (let i = 0; i < 15; i++) {
      cardNumber += Math.floor(Math.random() * 10);
    }
    
    // Luhn algorithm check digit
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    this.cardNumber = cardNumber + checkDigit;
  }
  next();
});

// Method to get public card info (without sensitive data)
cardSchema.methods.getPublicInfo = function() {
  const cardObject = this.toObject();
  delete cardObject.cvv;
  delete cardObject.pin;
  return cardObject;
};

module.exports = mongoose.model('Card', cardSchema);
