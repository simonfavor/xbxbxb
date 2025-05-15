const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plans');
const transactionRoutes = require('./routes/transactions');
const withdrawalRoutes = require('./routes/withdrawals');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const walletroutes = require('./routes/wallets')
const path = require('path');

dotenv.config();
const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallets', walletroutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));