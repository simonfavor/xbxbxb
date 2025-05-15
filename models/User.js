const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
  },
  firstName: {
    type: String,
    required: [true, 'First Name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last Name is required'],
    trim: true,
  },
  dob: {
    type: Date,
    required: [true, 'Date of Birth is required'],
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    match: [/^\d{10,15}$/, 'Invalid phone number'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Invalid email format'],
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
  },
  profilePicture: {
    type: String,
    default: '',
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  withdrawals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Withdrawal'
  }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);