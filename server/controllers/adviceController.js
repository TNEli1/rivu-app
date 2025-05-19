const OpenAI = require('openai');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const RivuScore = require('../models/RivuScore');

// Initialize OpenAI client with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the smart prompt templates
const PROMPT_TEMPLATES = {
  BUDGET_OVERVIEW: `You're an AI personal finance coach helping users improve their budgeting. Analyze the following user data and provide 2–3 personalized, actionable tips to help them stay on track or improve their habits:

- Monthly Income: ${{userIncome}}
- Budget Status:
  {{budgetDetails}}
- Rivu Score: {{rivuScore}} – {{scoreRating}}

Keep your response under 150 words. Write at a 6th-grade reading level using plain language and simple, actionable advice. Be friendly, casual, and non-judgmental.`,

  GOAL_FOCUSED: `You're an AI financial mentor. A user has entered the following savings goals and progress. Help them improve their consistency and mindset with 2–3 actionable tips:

{{goalDetails}}

They currently have a Rivu Score of {{rivuScore}}. Offer insight and encouragement to improve their savings behavior and hit more goals.`,

  MONTHLY_REFLECTION: `You're an AI personal finance coach offering a monthly recap. Based on the user's activity, spending habits, and savings progress, give them a short summary and 2 clear recommendations for next month.

- Total Income: ${{income}}
- Total Spent: ${{spentTotal}}
- Total Saved: ${{savedTotal}}
- Rivu Score: {{rivuScore}} – {{scoreRating}}

Focus on one area of improvement and one area to maintain. Keep the tone practical and supportive.`
};

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

    // Calculate monthly summaries for prompt templates
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransactions = transactions.filter(t => 
      new Date(t.date) >= thisMonth
    );
    
    const monthlyIncome = thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((total, t) => total + t.amount, 0);
      
    const monthlySpending = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((total, t) => total + t.amount, 0);
      
    const monthlySavings = Math.max(0, monthlyIncome - monthlySpending);
    
    // Map score to a rating
    const getScoreRating = (score) => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Fair';
      return 'Needs Improvement';
    };
    
    // Format budget details for prompt
    let budgetDetails = '';
    if (budgets.length > 0) {
      budgetDetails = budgets.map(b => {
        const percentUsed = b.amount > 0 
          ? Math.round((b.currentSpent / b.amount) * 100) 
          : 0;
        return `  - ${b.category}: $${b.currentSpent} spent out of $${b.amount} (${percentUsed}%)`;
      }).join('\n');
    } else {
      budgetDetails = '  - No budget categories set up yet';
    }
    
    // Format goals for prompt
    let goalDetails = '';
    if (goals.length > 0) {
      goalDetails = goals.map(g => {
        const progressPercent = g.targetAmount > 0 
          ? Math.round((g.savedAmount / g.targetAmount) * 100) 
          : 0;
        return `- ${g.name}: Saved $${g.savedAmount} out of $${g.targetAmount} (${progressPercent}%)`;
      }).join('\n');
    } else {
      goalDetails = '- No savings goals set up yet';
    }
    
    // Select which template to use based on available data
    let templateKey = 'MONTHLY_REFLECTION';
    
    // If they have goals set up, use the goal-focused template
    if (goals.length > 0) {
      templateKey = 'GOAL_FOCUSED';
    }
    
    // If they have budgets set up, use the budget overview template
    if (budgets.length > 0) {
      templateKey = 'BUDGET_OVERVIEW';
    }
    
    // If the user provides a specific prompt, use monthly reflection as it's most general
    if (prompt) {
      templateKey = 'MONTHLY_REFLECTION';
    }
    
    // Fill in the template with actual data
    let aiPrompt = PROMPT_TEMPLATES[templateKey]
      .replace('{{userIncome}}', monthlyIncome || 'Not set')
      .replace('{{budgetDetails}}', budgetDetails)
      .replace('{{goalDetails}}', goalDetails)
      .replace('{{rivuScore}}', rivuScoreValue)
      .replace('{{scoreRating}}', getScoreRating(rivuScoreValue))
      .replace('{{income}}', monthlyIncome || 0)
      .replace('{{spentTotal}}', monthlySpending)
      .replace('{{savedTotal}}', monthlySavings);
    
    // Add user prompt if provided
    if (prompt) {
      aiPrompt += `\n\nThe user is asking: "${prompt}"\n\nIncorporate this question into your advice.`;
    }

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