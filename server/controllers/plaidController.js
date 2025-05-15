const User = require('../models/User');

/**
 * @desc    Generate a Plaid link token
 * @route   POST /api/plaid/link-token
 * @access  Private
 */
const createLinkToken = async (req, res) => {
  try {
    // In a real implementation, this would call Plaid API to generate a link token
    // For simulation, we'll return a mock token
    
    // Return a simulated link token
    res.json({
      link_token: "simulated_link_token_" + Math.random().toString(36).substring(7),
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error creating Plaid link token:', error);
    res.status(500).json({ 
      message: 'Failed to generate link token', 
      error: error.message 
    });
  }
};

/**
 * @desc    Exchange public token for access token
 * @route   POST /api/plaid/exchange-token
 * @access  Private
 */
const exchangePublicToken = async (req, res) => {
  try {
    const { public_token, bank_name } = req.body;
    
    if (!public_token) {
      return res.status(400).json({ message: 'Missing public token' });
    }
    
    // In a real implementation, this would call Plaid API to exchange the public token
    // for an access token. For simulation, we'll save a mock access token to the user.
    
    // Find the user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create or update the user's plaidData
    if (!user.plaidData) {
      user.plaidData = {};
    }
    
    // Add the bank connection
    const accessToken = "simulated_access_token_" + Math.random().toString(36).substring(7);
    const itemId = "simulated_item_id_" + Math.random().toString(36).substring(7);
    
    user.plaidData.accessToken = accessToken;
    user.plaidData.itemId = itemId;
    user.plaidData.bankName = bank_name || 'Your Bank';
    user.plaidData.status = 'connected';
    user.plaidData.lastUpdated = new Date();
    
    await user.save();
    
    res.json({
      success: true,
      bank_name: bank_name || 'Your Bank',
      status: 'connected'
    });
  } catch (error) {
    console.error('Error exchanging Plaid public token:', error);
    res.status(500).json({ 
      message: 'Failed to connect bank account', 
      error: error.message 
    });
  }
};

/**
 * @desc    Get user's connected banks
 * @route   GET /api/plaid/accounts
 * @access  Private
 */
const getConnectedAccounts = async (req, res) => {
  try {
    // Find the user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the user has Plaid data
    if (!user.plaidData || !user.plaidData.status || user.plaidData.status !== 'connected') {
      return res.json([]);
    }
    
    // In a real implementation, this would call Plaid API to fetch account details
    
    // Return mock account data
    res.json([
      {
        id: user.plaidData.itemId,
        name: user.plaidData.bankName,
        type: 'checking',
        status: user.plaidData.status,
        lastUpdated: user.plaidData.lastUpdated
      }
    ]);
  } catch (error) {
    console.error('Error getting connected accounts:', error);
    res.status(500).json({ 
      message: 'Failed to fetch connected accounts', 
      error: error.message 
    });
  }
};

/**
 * @desc    Refresh Plaid account data
 * @route   POST /api/plaid/refresh/:id
 * @access  Private
 */
const refreshAccountData = async (req, res) => {
  try {
    const accountId = req.params.id;
    
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }
    
    // Find the user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the user has Plaid data
    if (!user.plaidData || !user.plaidData.status || user.plaidData.status !== 'connected') {
      return res.status(400).json({ message: 'No connected account found' });
    }
    
    // In a real implementation, this would call Plaid API to refresh account data
    
    // Update lastUpdated timestamp
    user.plaidData.lastUpdated = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'Account data refreshed successfully',
      lastUpdated: user.plaidData.lastUpdated
    });
  } catch (error) {
    console.error('Error refreshing account data:', error);
    res.status(500).json({ 
      message: 'Failed to refresh account data', 
      error: error.message 
    });
  }
};

module.exports = {
  createLinkToken,
  exchangePublicToken,
  getConnectedAccounts,
  refreshAccountData
};