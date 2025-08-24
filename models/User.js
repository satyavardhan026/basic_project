const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/
  },
  creditCard: {
    cardNumber: {
      type: String,
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
    }
  },
  debitCard: {
    cardNumber: {
      type: String,
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
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  accountBalance: {
    type: Number,
    default: 0
  },
  accountNumber: {
    type: String,
    unique: true,
    default: function() {
      return 'IB' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.creditCard.cvv;
  delete userObject.debitCard.cvv;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
