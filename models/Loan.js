const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loanType: {
    type: String,
    enum: ['personal', 'home', 'business', 'education', 'vehicle'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1000
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0.1,
    max: 25
  },
  term: {
    type: Number,
    required: true,
    min: 1,
    max: 360 // months
  },
  monthlyPayment: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'closed'],
    default: 'pending'
  },
  purpose: {
    type: String,
    trim: true,
    maxlength: 200
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  disbursedAt: {
    type: Date
  },
  nextPaymentDate: {
    type: Date
  },
  remainingBalance: {
    type: Number,
    default: 0
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
loanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate monthly payment and total amount
loanSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('interestRate') || this.isModified('term')) {
    const monthlyRate = this.interestRate / 100 / 12;
    const numberOfPayments = this.term;
    
    if (monthlyRate > 0) {
      this.monthlyPayment = (this.amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                           (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    } else {
      this.monthlyPayment = this.amount / numberOfPayments;
    }
    
    this.totalAmount = this.monthlyPayment * numberOfPayments;
    this.remainingBalance = this.amount;
  }
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
