import Account from '../models/Account.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc    Get user accounts
 * @route   GET /api/user/accounts
 * @access  Private
 */
const getUserAccounts = asyncHandler(async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id }).sort({ name: 1 });
    
    // Extract account names for simplicity
    const accountNames = accounts.map(account => account.name);
    
    res.status(200).json({ accounts: accountNames });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to fetch accounts: ' + error.message);
  }
});

/**
 * @desc    Add a new account 
 * @route   POST /api/user/accounts
 * @access  Private
 */
const addUserAccount = asyncHandler(async (req, res) => {
  const { account } = req.body;
  
  if (!account || !account.trim()) {
    res.status(400);
    throw new Error('Please enter an account name');
  }

  try {
    // Check if account already exists for this user
    const existingAccount = await Account.findOne({ userId: req.user._id, name: account });
    
    if (existingAccount) {
      res.status(200); // Success, but just return existing accounts
      const accounts = await Account.find({ userId: req.user._id }).sort({ name: 1 });
      return res.json({ accounts: accounts.map(acc => acc.name) });
    }
    
    // Create new account
    await Account.create({
      userId: req.user._id,
      name: account.trim()
    });
    
    // Return all accounts
    const accounts = await Account.find({ userId: req.user._id }).sort({ name: 1 });
    
    res.status(201).json({ accounts: accounts.map(acc => acc.name) });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to add account: ' + error.message);
  }
});

/**
 * @desc    Delete a user account
 * @route   DELETE /api/user/accounts/:id
 * @access  Private
 */
const deleteUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const account = await Account.findById(id);
    
    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }
    
    // Verify ownership
    if (account.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this account');
    }
    
    await account.remove();
    
    // Return remaining accounts
    const accounts = await Account.find({ userId: req.user._id }).sort({ name: 1 });
    
    res.status(200).json({ accounts: accounts.map(acc => acc.name) });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to delete account: ' + error.message);
  }
});

export { getUserAccounts, addUserAccount, deleteUserAccount };