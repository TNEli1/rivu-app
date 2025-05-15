const RivuScore = require('../models/RivuScore');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');

// @desc    Get user's Rivu Score
// @route   GET /api/rivu-score
// @access  Private
const getRivuScore = async (req, res) => {
  try {
    // Check if score exists, if not, calculate it
    let rivuScore = await RivuScore.findOne({ user: req.user._id });
    
    if (!rivuScore) {
      // Calculate score from scratch
      rivuScore = await calculateRivuScore(req.user._id);
    }
    
    res.json({
      score: rivuScore.score,
      factors: rivuScore.factorsWithRatings,
      rawFactors: rivuScore.factors,
      lastUpdated: rivuScore.updatedAt
    });
  } catch (error) {
    console.error('Error getting Rivu Score:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Calculate Rivu Score based on user's financial data
async function calculateRivuScore(userId) {
  try {
    // Calculate budget adherence (% of categories staying under budget)
    const budgets = await Budget.find({ user: userId });
    
    let budgetAdherence = 0;
    if (budgets.length > 0) {
      let underBudgetCount = 0;
      
      for (const budget of budgets) {
        if (budget.currentSpent <= budget.amount) {
          underBudgetCount++;
        }
      }
      
      budgetAdherence = Math.round((underBudgetCount / budgets.length) * 100);
    } else {
      // Default value if no budgets exist
      budgetAdherence = 0;
    }
    
    // Calculate savings goal progress
    const goals = await Goal.find({ user: userId });
    
    let savingsProgress = 0;
    if (goals.length > 0) {
      let totalProgress = 0;
      
      for (const goal of goals) {
        const progress = goal.targetAmount > 0 
          ? (goal.currentAmount / goal.targetAmount) * 100 
          : 0;
        totalProgress += Math.min(progress, 100);
      }
      
      savingsProgress = Math.round(totalProgress / goals.length);
    } else {
      // Default value if no goals exist
      savingsProgress = 0;
    }
    
    // Calculate weekly activity score
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentTransactions = await Transaction.find({
      user: userId,
      date: { $gte: oneWeekAgo }
    });
    
    // Activity score based on number of recent transactions
    let weeklyActivity = Math.min(recentTransactions.length * 10, 100);
    
    // If no transactions, default to 0
    if (recentTransactions.length === 0) {
      weeklyActivity = 0;
    }
    
    // Calculate overall score (weighted average)
    // Score = (budget adherence * 0.5) + (savings progress * 0.3) + (weekly engagement * 0.2)
    const score = Math.round(
      (budgetAdherence * 0.5) + 
      (savingsProgress * 0.3) + 
      (weeklyActivity * 0.2)
    );
    
    // Create or update the score record
    let rivuScore = await RivuScore.findOne({ user: userId });
    
    if (rivuScore) {
      rivuScore.score = score;
      rivuScore.factors = {
        budgetAdherence,
        savingsProgress,
        weeklyActivity
      };
      rivuScore.updatedAt = new Date();
      
      await rivuScore.save();
    } else {
      rivuScore = await RivuScore.create({
        user: userId,
        score,
        factors: {
          budgetAdherence,
          savingsProgress,
          weeklyActivity
        }
      });
    }
    
    return rivuScore;
  } catch (error) {
    console.error('Error calculating Rivu Score:', error);
    throw error;
  }
}

module.exports = {
  getRivuScore,
  calculateRivuScore
};