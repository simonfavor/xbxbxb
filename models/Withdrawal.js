const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  cryptoCurrency: {
    type: String,
    enum: ['btc', 'eth', 'usdt', 'usdc', 'bnb'],
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending',
  },
  type: {
    type: String,
    default: 'Withdrawal'
  }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);