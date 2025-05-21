const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

/**
 * @desc    Get dashboard summary data
 * @route   GET /api/dashboard/summary
 * @access  Private
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Calculate the start of the current week (Sunday)
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // Go back to Sunday
    currentWeekStart.setHours(0, 0, 0, 0); // Start of day
    
    // Get all transactions for calculating total balance
    const allTransactions = await Transaction.find({ 
      user: userId 
    });
    
    // Get transactions for the current week
    const weeklyTransactions = await Transaction.find({ 
      user: userId,
      date: { $gte: currentWeekStart }
    });
    
    // Calculate total balance (sum of all transaction amounts)
    const totalBalance = allTransactions.reduce((sum, transaction) => {
      return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
    }, 0);
    
    // Calculate spent this week (sum of expense transactions)
    const weeklySpending = weeklyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Determine weekly budget (for now, hardcoded to match the example)
    // In a real app, this would come from user's budget settings
    const weeklyBudget = 2000; // Default weekly budget
    const remainingBudget = Math.max(0, weeklyBudget - weeklySpending);
    
    res.json({
      totalBalance: totalBalance,
      weeklySpending: weeklySpending,
      remainingBudget: remainingBudget
    });
    
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
};

/**
 * @desc    Get recent transactions
 * @route   GET /api/transactions/recent
 * @access  Private
 */
exports.getRecentTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 3;
    
    const transactions = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .limit(limit);
    
    res.json(transactions.map(t => ({
      id: t._id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type
    })));
    
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ message: 'Failed to fetch recent transactions' });
  }
};