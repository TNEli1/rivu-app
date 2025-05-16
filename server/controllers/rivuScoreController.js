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

// @desc    Recalculate user's Rivu Score
// @route   POST /api/rivu-score/recalculate
// @access  Private
const recalculateRivuScore = async (req, res) => {
  try {
    // Force recalculation of the score
    const rivuScore = await calculateRivuScore(req.user._id);
    
    res.json({
      score: rivuScore.score,
      factors: rivuScore.factorsWithRatings,
      rawFactors: rivuScore.factors,
      lastUpdated: rivuScore.updatedAt
    });
  } catch (error) {
    console.error('Error recalculating Rivu Score:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Advanced Rivu Score calculation based on production requirements
async function calculateRivuScore(userId) {
  try {
    console.log(`Calculating Rivu Score for user: ${userId}`);
    
    // Ensure we always use the userId from authentication
    if (!userId) {
      console.error('No userId provided for Rivu Score calculation');
      throw new Error('User ID is required for Rivu Score calculation');
    }

    // Calculate budget adherence (% of categories staying under budget)
    const budgets = await Budget.find({ user: userId });
    console.log(`Found ${budgets.length} budgets for user ${userId}`);
    
    // Budget adherence rate (0-1)
    let budgetAdherenceRate = 0;
    if (budgets.length > 0) {
      let underBudgetCount = 0;
      
      for (const budget of budgets) {
        if (budget.currentSpent <= budget.amount) {
          underBudgetCount++;
        }
      }
      
      budgetAdherenceRate = underBudgetCount / budgets.length;
    }
    
    // Calculate savings goal progress
    const goals = await Goal.find({ user: userId });
    console.log(`Found ${goals.length} goals for user ${userId}`);
    
    // Savings progress rate (0-1)
    let savingsProgressRate = 0;
    if (goals.length > 0) {
      let totalProgress = 0;
      
      for (const goal of goals) {
        const progress = goal.targetAmount > 0 
          ? (goal.currentAmount / goal.targetAmount)
          : 0;
        totalProgress += Math.min(progress, 1);
      }
      
      savingsProgressRate = totalProgress / goals.length;
    }
    
    // Calculate goals completed rate (0-1)
    let goalsCompletedRate = 0;
    if (goals.length > 0) {
      let completedGoals = 0;
      
      for (const goal of goals) {
        if (goal.currentAmount >= goal.targetAmount) {
          completedGoals++;
        }
      }
      
      goalsCompletedRate = completedGoals / goals.length;
    }
    
    // Calculate weekly engagement rate (0-1)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = Math.min(now.getDate(), daysInMonth);
    
    // Get all transactions this month
    const monthlyTransactions = await Transaction.find({
      user: userId,
      date: { $gte: startOfMonth }
    });
    
    console.log(`Found ${monthlyTransactions.length} transactions this month for user ${userId}`);
    
    // Count unique days with activity
    const activeDays = new Set();
    monthlyTransactions.forEach(transaction => {
      const day = new Date(transaction.date).getDate();
      activeDays.add(day);
    });
    
    // Weekly engagement rate (active days / days passed)
    const weeklyEngagementRate = daysPassed > 0 ? Math.min(activeDays.size / daysPassed, 1) : 0;
    
    // Calculate income to spending ratio
    const thisMonth = await Transaction.find({
      user: userId,
      date: { $gte: startOfMonth }
    });
    
    let monthlyIncome = 0;
    let monthlySpending = 0;
    
    thisMonth.forEach(transaction => {
      if (transaction.type === 'income') {
        monthlyIncome += transaction.amount;
      } else {
        monthlySpending += transaction.amount;
      }
    });
    
    // Income to spending ratio (-1 to 1)
    let incomeToSpendingRatio = 0;
    if (monthlyIncome > 0) {
      incomeToSpendingRatio = (monthlyIncome - monthlySpending) / monthlyIncome;
    }
    
    // Apply the advanced Rivu Score calculation formula
    const WEIGHTS = {
      budget: 0.35,
      savings: 0.25,
      engagement: 0.15,
      goals: 0.15,
      cashFlow: 0.10
    };
    
    // Calculate score using the weights
    let score = 0;
    score += (budgetAdherenceRate * 100) * WEIGHTS.budget;
    score += (savingsProgressRate * 100) * WEIGHTS.savings;
    score += (weeklyEngagementRate * 100) * WEIGHTS.engagement;
    score += (goalsCompletedRate * 100) * WEIGHTS.goals;
    score += (incomeToSpendingRatio * 100) * WEIGHTS.cashFlow;
    
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    console.log(`Final calculated Rivu Score for user ${userId}: ${score}`);
    
    // Create or update the score record in MongoDB
    let rivuScore = await RivuScore.findOne({ user: userId });
    
    const factorsData = {
      budgetAdherenceRate,
      savingsProgressRate,
      weeklyEngagementRate,
      goalsCompletedRate,
      incomeToSpendingRatio
    };
    
    // Create factors with ratings for display
    const factorsWithRatings = [
      {
        name: "Budget Adherence",
        value: Math.round(budgetAdherenceRate * 100),
        rating: getRating(budgetAdherenceRate * 100),
        weight: WEIGHTS.budget * 100
      },
      {
        name: "Savings Progress",
        value: Math.round(savingsProgressRate * 100),
        rating: getRating(savingsProgressRate * 100),
        weight: WEIGHTS.savings * 100
      },
      {
        name: "Weekly Engagement",
        value: Math.round(weeklyEngagementRate * 100),
        rating: getRating(weeklyEngagementRate * 100),
        weight: WEIGHTS.engagement * 100
      },
      {
        name: "Goals Completed",
        value: Math.round(goalsCompletedRate * 100),
        rating: getRating(goalsCompletedRate * 100),
        weight: WEIGHTS.goals * 100
      },
      {
        name: "Cash Flow",
        value: Math.round(incomeToSpendingRatio * 100),
        rating: getRating(incomeToSpendingRatio * 100),
        weight: WEIGHTS.cashFlow * 100
      }
    ];
    
    if (rivuScore) {
      rivuScore.score = score;
      rivuScore.factors = factorsData;
      rivuScore.factorsWithRatings = factorsWithRatings;
      rivuScore.updatedAt = new Date();
      
      await rivuScore.save();
      console.log(`Updated existing Rivu Score record for user ${userId}`);
    } else {
      rivuScore = await RivuScore.create({
        user: userId,
        score,
        factors: factorsData,
        factorsWithRatings,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Created new Rivu Score record for user ${userId}`);
    }
    
    return rivuScore;
  } catch (error) {
    console.error(`Error calculating Rivu Score for user ${userId}:`, error);
    throw error;
  }
}

// Helper function to get rating text based on score
function getRating(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Needs Improvement";
  return "Poor";
}

module.exports = {
  getRivuScore,
  recalculateRivuScore,
  calculateRivuScore
};