import { storage } from '../storage';

/**
 * @desc    Get transaction summary (monthly metrics)
 */
export const getTransactionSummary = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    console.log(`Fetching transaction summary for user: ${userId}`);
    
    // Get all transactions for this user
    const transactions = await storage.getTransactions(userId);
    
    // Log transaction count for debugging
    console.log(`Found ${transactions.length} transactions for summary calculation`);
    
    // Get current month and previous month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter(t => {
      try {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      } catch (err) {
        console.error(`Invalid date format for transaction: ${t.id}`, err);
        return false;
      }
    });
    
    // Filter transactions for previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthTransactions = transactions.filter(t => {
      try {
        const tDate = new Date(t.date);
        return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
      } catch (err) {
        console.error(`Invalid date format for transaction: ${t.id}`, err);
        return false;
      }
    });
    
    // Calculate current month totals
    const currentMonthSpending = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
      
    const currentMonthIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
      
    // Monthly savings should be income minus spending, or zero if negative
    const currentMonthSavings = Math.max(0, currentMonthIncome - currentMonthSpending);
    
    // Calculate previous month totals
    const prevMonthSpending = prevMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
      
    const prevMonthIncome = prevMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
      
    const prevMonthSavings = Math.max(0, prevMonthIncome - prevMonthSpending);
    
    // Calculate percent changes with a capped range to avoid extreme values
    const calculateChange = (current: number, previous: number): number => {
      // If both values are 0, there's no change (0%)
      if (current === 0 && previous === 0) return 0;
      
      // If previous is 0 but current isn't, we can't calculate percentage
      // Instead, return a reasonable maximum (100% increase)
      if (previous === 0) return 100;
      
      // Calculate percentage change
      const change = ((current - previous) / previous) * 100;
      
      // Cap change at reasonable limits to avoid excessive values
      return Math.max(Math.min(change, 999), -99);
    };
    
    // Format to 1 decimal place
    const formatChange = (change: number): number => {
      return parseFloat(change.toFixed(1));
    };
    
    // Calculate changes with reasonable limits
    const spendingChange = formatChange(calculateChange(currentMonthSpending, prevMonthSpending));
    const incomeChange = formatChange(calculateChange(currentMonthIncome, prevMonthIncome));
    const savingsChange = formatChange(calculateChange(currentMonthSavings, prevMonthSavings));
    
    // Create result object
    const summary = {
      monthlySpending: currentMonthSpending,
      monthlyIncome: currentMonthIncome,
      monthlySavings: currentMonthSavings,
      spendingChange: spendingChange,
      incomeChange: incomeChange,
      savingsChange: savingsChange
    };
    
    console.log('Transaction summary calculated:', {
      userId,
      spending: summary.monthlySpending,
      income: summary.monthlyIncome,
      savings: summary.monthlySavings,
      spendingChange: summary.spendingChange,
      incomeChange: summary.incomeChange,
      savingsChange: summary.savingsChange
    });
    
    res.json(summary);
  } catch (error: any) {
    console.error('Error calculating transaction summary:', error);
    res.status(500).json({ 
      message: error.message || 'Error calculating transaction summary',
      code: 'SERVER_ERROR'
    });
  }
};

export default {
  getTransactionSummary
};