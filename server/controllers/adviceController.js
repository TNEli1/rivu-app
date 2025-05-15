const OpenAI = require('openai');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const RivuScore = require('../models/RivuScore');

// Initialize OpenAI client with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// @desc    Get AI-powered financial advice
// @route   POST /api/advice
// @access  Private
const getAdvice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { prompt } = req.body;

    // Get user's financial data for context
    const [budgets, transactions, goals, rivuScore] = await Promise.all([
      Budget.find({ userId }).lean(),
      Transaction.find({ userId }).sort({ date: -1 }).limit(10).lean(),
      Goal.find({ userId }).lean(),
      RivuScore.findOne({ userId }).lean()
    ]);

    // Calculate actual metrics for structured format
    const rivuScoreValue = rivuScore ? rivuScore.score : 0;
    
    // Calculate budget adherence
    const budgetsMetCount = budgets.filter(b => b.currentSpent <= b.amount).length;
    const budgetGoalsMetPercentage = budgets.length > 0 
      ? Math.round((budgetsMetCount / budgets.length) * 100) 
      : 0;
    
    // Calculate savings progress
    const totalSavingsProgress = goals.length > 0
      ? goals.reduce((total, goal) => {
          const progress = goal.targetAmount > 0 
            ? (goal.savedAmount / goal.targetAmount) * 100 
            : 0;
          return total + progress;
        }, 0) / goals.length
      : 0;
    
    // Calculate goals completed
    const completedGoals = goals.filter(g => g.savedAmount >= g.targetAmount).length;
    
    // Determine engagement level based on transaction count
    let weeklyEngagement = "Low";
    if (transactions.length >= 10) weeklyEngagement = "High";
    else if (transactions.length >= 5) weeklyEngagement = "Medium";
    
    // Format in the exact required structure
    const structuredUserData = `
User Rivu Score: ${rivuScoreValue}  
Budget Goals Met: ${budgetGoalsMetPercentage}%  
Savings Progress: ${Math.round(totalSavingsProgress)}%  
Weekly Engagement: ${weeklyEngagement}  
Goals Completed: ${completedGoals} out of ${goals.length}  
`;

    // For context, include detailed financial data
    const financialContext = {
      rivuScore: rivuScoreValue,
      budgetGoalsMet: `${budgetGoalsMetPercentage}%`,
      savingsProgress: `${Math.round(totalSavingsProgress)}%`,
      weeklyEngagement,
      goalsCompleted: `${completedGoals} out of ${goals.length}`,
      
      // Additional details for context
      budgets: budgets.map(budget => ({
        category: budget.category,
        budgeted: budget.amount,
        spent: budget.currentSpent,
        percentUsed: budget.amount > 0 ? Math.round((budget.currentSpent / budget.amount) * 100) + '%' : '0%'
      })),
      recentTransactions: transactions.map(tx => ({
        date: tx.date.toLocaleDateString(),
        merchant: tx.merchant,
        amount: tx.amount,
        category: tx.category,
        type: tx.type
      })),
      savingsGoals: goals.map(goal => ({
        name: goal.name,
        target: goal.targetAmount,
        current: goal.savedAmount,
        progress: goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) + '%' : '0%'
      }))
    };

    // Construct the prompt
    let aiPrompt = 'As an AI financial coach, analyze this user\'s financial data and provide personalized advice:';
    aiPrompt += '\n\nUser Financial Summary: ' + structuredUserData;
    aiPrompt += '\n\nDetailed Financial Context: ' + JSON.stringify(financialContext, null, 2);
    
    if (prompt) {
      aiPrompt += `\n\nThe user is asking: "${prompt}"`;
    }
    
    aiPrompt += '\n\nProvide specific, actionable financial advice based on the user\'s spending patterns, budget adherence, and savings goals. Keep your response concise (1-2 short paragraphs) and easy to understand.';

    try {
      // Call OpenAI API with the prompt
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: aiPrompt }],
        max_tokens: 300
      });

      const message = response.choices[0].message.content || 
        "I notice some trends in your spending. Consider reviewing your budget categories and adjust as needed to improve your financial health.";
      
      res.json({ message });
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Fallback message if API fails
      res.json({ 
        message: "You're doing great — keep it up! Continue tracking your expenses to improve your financial health."
      });
    }
  } catch (error) {
    console.error('Server error in advice controller:', error);
    res.status(500).json({ 
      message: "I'm having trouble analyzing your finances right now. Please try again later."
    });
  }
};

module.exports = {
  getAdvice
};