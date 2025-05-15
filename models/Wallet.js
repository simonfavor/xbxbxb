const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    unique: true
  },
  network: {
    type: String,
    required: true
  },
  contractAddress: {
    type: String,
    default: null
  },
  walletAddress: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  iconUrl: {
    type: String,
    default: ''
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

walletSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);