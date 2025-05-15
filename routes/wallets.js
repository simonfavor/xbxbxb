const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');

// Get all wallets
router.get('/', async (req, res) => {
    try {
      const wallets = await Wallet.find().sort({ name: 1 });
      res.json(wallets);
    } catch (error) {
      console.log('Error fetching wallets:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get active wallets
  router.get('/active', async (req, res) => {
    try {
      const wallets = await Wallet.find({ isActive: true }).sort({ name: 1 });
      res.json(wallets);
    } catch (error) {
      console.log('Error fetching active wallets:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create new wallet
  router.post('/', async (req, res) => {
    try {
      const { name, symbol, network, contractAddress, walletAddress, iconUrl } = req.body;
      
      const existingWallet = await Wallet.findOne({ $or: [{ name }, { symbol }] });
      if (existingWallet) {
        return res.status(400).json({ message: 'Wallet with this name or symbol already exists' });
      }
  
      const wallet = new Wallet({
        name,
        symbol,
        network,
        contractAddress,
        walletAddress,
        iconUrl
      });
  
      await wallet.save();
      res.status(201).json(wallet);
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update wallet
  router.put('/:id', async (req, res) => {
    try {
      const { name, symbol, network, contractAddress, walletAddress, isActive, iconUrl } = req.body;
      
      const wallet = await Wallet.findById(req.params.id);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
  
      // Check if name or symbol already exists for another wallet
      const existingWallet = await Wallet.findOne({
        $and: [
          { _id: { $ne: req.params.id } },
          { $or: [{ name }, { symbol }] }
        ]
      });
      
      if (existingWallet) {
        return res.status(400).json({ message: 'Another wallet with this name or symbol already exists' });
      }
  
      wallet.name = name || wallet.name;
      wallet.symbol = symbol || wallet.symbol;
      wallet.network = network || wallet.network;
      wallet.contractAddress = contractAddress || wallet.contractAddress;
      wallet.walletAddress = walletAddress || wallet.walletAddress;
      wallet.isActive = typeof isActive !== 'undefined' ? isActive : wallet.isActive;
      wallet.iconUrl = iconUrl || wallet.iconUrl;
  
      await wallet.save();
      res.json(wallet);
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete wallet
  router.delete('/:id', async (req, res) => {
    try {
      const wallet = await Wallet.findByIdAndDelete(req.params.id);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      res.json({ message: 'Wallet deleted successfully' });
    } catch (error) {
      console.error('Error deleting wallet:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;