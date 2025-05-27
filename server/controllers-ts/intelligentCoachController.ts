import { Request, Response } from 'express';
import { storage } from '../storage';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface BehaviorInsights {
  savingsConsistency: number;
  budgetDrift: number;
  spendingVolatility: number;
  goalProgress: number;
  nudgeResponse: number;
}

interface FinancialContext {
  monthlyIncome: number;
  monthlyExpenses: number;
  surplus: number;
  topSpendingCategories: string[];
  savingsRate: number;
  emergencyFundMonths: number;
}

/**
 * Enhanced AI Coach - Behavior-Aware Financial Assistant
 * Provides personalized, intelligent coaching based on user behavior patterns
 */
export class IntelligentCoachController {
  
  /**
   * Get coach conversation history (Premium feature)
   */
  static async getCoachHistory(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Check if user has premium access for conversation history
      const user = await storage.getUser(userId);
      const isPremium = user?.isPremium || false; // You'll need to add this field to user schema

      if (!isPremium) {
        return res.status(403).json({ 
          error: 'Premium feature',
          message: 'Conversation history is available for Premium users only' 
        });
      }

      // Get recent conversations (last 30 days)
      const conversations = await storage.getCoachConversations(userId, 30);
      
      res.json({
        conversations: conversations.map(conv => ({
          id: conv.id,
          userMessage: conv.userMessage,
          coachResponse: conv.coachResponse,
          createdAt: conv.createdAt,
          behaviorInsights: conv.behaviorInsights ? JSON.parse(conv.behaviorInsights) : null
        })),
        isPremium
      });

    } catch (error) {
      console.error('Error fetching coach history:', error);
      res.status(500).json({ error: 'Failed to fetch conversation history' });
    }
  }

  /**
   * Generate behavior-aware coaching response
   */
  static async generateCoachResponse(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      const { userPrompt } = req.body;

      if (!userId || !userPrompt?.trim()) {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'User prompt is required for AI coaching' 
        });
      }

      // Get comprehensive user data for behavior analysis
      const [user, transactions, goals, rivuScore, recentConversations] = await Promise.all([
        storage.getUser(userId),
        storage.getTransactions(userId),
        storage.getSavingsGoals(userId),
        storage.getRivuScore(userId),
        storage.getRecentCoachConversations(userId, 5) // Last 5 conversations for context
      ]);

      // Calculate behavior insights
      const behaviorInsights = await IntelligentCoachController.calculateBehaviorInsights(userId, transactions, goals);
      
      // Build financial context
      const financialContext = await IntelligentCoachController.buildFinancialContext(transactions, goals);

      // Generate personalized coaching prompt
      const enhancedPrompt = IntelligentCoachController.buildIntelligentPrompt(
        userPrompt,
        user,
        financialContext,
        behaviorInsights,
        recentConversations
      );

      // Get AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: enhancedPrompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      const coachResponse = completion.choices[0]?.message?.content || 
        "I'm having trouble accessing my knowledge right now. Please try again in a moment.";

      // Save conversation (mark as premium if user has premium)
      const isPremium = user?.isPremium || false;
      await storage.saveCoachConversation({
        userId,
        userMessage: userPrompt,
        coachResponse,
        context: JSON.stringify(financialContext),
        behaviorInsights: JSON.stringify(behaviorInsights),
        isPremium
      });

      // Update behavior analytics
      await IntelligentCoachController.updateBehaviorAnalytics(userId, behaviorInsights);

      res.json({
        message: coachResponse,
        behaviorInsights: isPremium ? behaviorInsights : null, // Only show insights to premium users
        financialSnapshot: {
          surplus: financialContext.surplus,
          savingsRate: financialContext.savingsRate,
          topSpending: financialContext.topSpendingCategories[0]
        }
      });

    } catch (error) {
      console.error('Error generating coach response:', error);
      res.status(500).json({ 
        error: 'Failed to generate coaching response',
        message: 'Please try again in a moment' 
      });
    }
  }

  /**
   * Calculate advanced behavior insights
   */
  private static async calculateBehaviorInsights(
    userId: number, 
    transactions: any[], 
    goals: any[]
  ): Promise<BehaviorInsights> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Savings consistency (how regularly user saves)
    const savingsTransactions = transactions.filter(t => 
      t.category === 'Savings' && new Date(t.date) >= thirtyDaysAgo
    );
    const savingsConsistency = Math.min(100, (savingsTransactions.length / 30) * 100);

    // Budget drift (spending vs budget)
    const categories = await storage.getBudgetCategories(userId);
    let budgetDrift = 0;
    if (categories.length > 0) {
      const totalBudget = categories.reduce((sum, cat) => sum + parseFloat(cat.budgetAmount || '0'), 0);
      const totalSpent = categories.reduce((sum, cat) => sum + parseFloat(cat.spentAmount || '0'), 0);
      budgetDrift = totalBudget > 0 ? Math.max(0, 100 - ((totalSpent / totalBudget) * 100)) : 50;
    }

    // Spending volatility (consistency in spending patterns)
    const weeklySpending = IntelligentCoachController.calculateWeeklySpending(transactions);
    const spendingVolatility = IntelligentCoachController.calculateVolatility(weeklySpending);

    // Goal progress rate
    const activeGoals = goals.filter(g => !g.completed);
    const avgGoalProgress = activeGoals.length > 0 
      ? activeGoals.reduce((sum, goal) => sum + (goal.progressPercentage || 0), 0) / activeGoals.length
      : 0;

    return {
      savingsConsistency: Math.round(savingsConsistency),
      budgetDrift: Math.round(budgetDrift),
      spendingVolatility: Math.round(100 - spendingVolatility), // Invert so higher is better
      goalProgress: Math.round(avgGoalProgress),
      nudgeResponse: 75 // Placeholder - would track response to nudges over time
    };
  }

  /**
   * Build comprehensive financial context
   */
  private static async buildFinancialContext(transactions: any[], goals: any[]): Promise<FinancialContext> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);

    const monthlyIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || '0')), 0);

    const monthlyExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || '0')), 0);

    const surplus = monthlyIncome - monthlyExpenses;

    // Top spending categories
    const categorySpending = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Other';
        acc[category] = (acc[category] || 0) + Math.abs(parseFloat(t.amount || '0'));
        return acc;
      }, {} as Record<string, number>);

    const topSpendingCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    const savingsRate = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0;

    return {
      monthlyIncome,
      monthlyExpenses,
      surplus,
      topSpendingCategories,
      savingsRate,
      emergencyFundMonths: 0 // Would calculate based on savings goals
    };
  }

  /**
   * Build intelligent, behavior-aware prompt
   */
  private static buildIntelligentPrompt(
    userPrompt: string,
    user: any,
    context: FinancialContext,
    behavior: BehaviorInsights,
    recentConversations: any[]
  ): string {
    const conversationHistory = recentConversations.length > 0 
      ? `\n\nRecent conversation context:\n${recentConversations.map(conv => 
          `User: ${conv.userMessage}\nCoach: ${conv.coachResponse}`
        ).join('\n\n')}`
      : '';

    return `You are Rivu, a personal and friendly AI financial coach. Be warm, direct, and use the user's real financial data to give specific advice.

USER QUESTION: "${userPrompt}"

FINANCIAL SNAPSHOT:
- Monthly surplus: $${context.surplus.toFixed(0)} (${context.surplus > 0 ? 'positive' : 'overspending'})
- Savings rate: ${context.savingsRate.toFixed(1)}%
- Top spending: ${context.topSpendingCategories.join(', ')}

BEHAVIOR PATTERNS:
- Savings consistency: ${behavior.savingsConsistency}% (how regularly you save)
- Budget adherence: ${behavior.budgetDrift}% (staying within budget)
- Spending stability: ${behavior.spendingVolatility}% (consistent spending patterns)
- Goal progress: ${behavior.goalProgress}% (progress toward savings goals)

COACHING GUIDELINES:
1. Be personal and friendly - use "you" and reference their actual data
2. Give specific, actionable advice based on their real numbers
3. Acknowledge their behavior patterns (good or concerning)
4. If they have a surplus, suggest specific allocation amounts
5. Keep responses under 150 words and conversational
6. Avoid generic age/income demographic language

${conversationHistory}

Respond as their personal financial coach with specific advice based on their real situation:`;
  }

  /**
   * Helper methods for calculations
   */
  private static calculateWeeklySpending(transactions: any[]): number[] {
    const weeks = Array(4).fill(0);
    const now = new Date();
    
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const transactionDate = new Date(t.date);
        const weekDiff = Math.floor((now.getTime() - transactionDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weekDiff >= 0 && weekDiff < 4) {
          weeks[weekDiff] += Math.abs(parseFloat(t.amount || '0'));
        }
      }
    });
    
    return weeks;
  }

  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);
    
    return mean > 0 ? (volatility / mean) * 100 : 0;
  }

  /**
   * Update user behavior analytics
   */
  private static async updateBehaviorAnalytics(userId: number, insights: BehaviorInsights) {
    try {
      const analytics = [
        { behaviorType: 'savings_consistency', metricValue: insights.savingsConsistency },
        { behaviorType: 'budget_adherence', metricValue: insights.budgetDrift },
        { behaviorType: 'spending_volatility', metricValue: insights.spendingVolatility },
        { behaviorType: 'goal_progress', metricValue: insights.goalProgress },
        { behaviorType: 'nudge_response', metricValue: insights.nudgeResponse }
      ];

      for (const analytic of analytics) {
        await storage.saveBehaviorAnalytics({
          userId,
          behaviorType: analytic.behaviorType,
          metricValue: analytic.metricValue.toString(),
          timeframe: 'monthly',
          metadata: JSON.stringify({ calculatedAt: new Date().toISOString() })
        });
      }
    } catch (error) {
      console.error('Error updating behavior analytics:', error);
    }
  }
}

export default IntelligentCoachController;