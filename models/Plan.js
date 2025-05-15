const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Stocks', 'Bonds', 'Crypto', 'Crypto Compounding', 'Agriculture', 'Real Estate'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  roi: {
    type: Number,
    required: true,
  },
  withdrawalPeriod: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Completed'],
    default: 'Pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);