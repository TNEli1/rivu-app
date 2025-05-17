import { storage } from '../storage';
import { InsertSavingsGoal } from '@shared/schema';

/**
 * @desc    Get all savings goals for the current user
 */
export const getGoals = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Get goals from PostgreSQL storage
    const goals = await storage.getSavingsGoals(userId);
    
    // Format goals data for client consistency
    const formattedGoals = goals.map(goal => {
      // Parse the monthly savings JSON
      let monthlyData = [];
      try {
        monthlyData = JSON.parse(goal.monthlySavings || '[]');
      } catch (error) {
        console.error('Error parsing monthly savings data', error);
      }
      
      return {
        id: goal.id,
        name: goal.name,
        targetAmount: parseFloat(String(goal.targetAmount)),
        currentAmount: parseFloat(String(goal.currentAmount)),
        targetDate: goal.targetDate,
        progressPercentage: parseFloat(String(goal.progressPercentage)),
        monthlySavings: monthlyData,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt
      };
    });
    
    res.json(formattedGoals);
  } catch (error: any) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching savings goals',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get a single goal by ID
 */
export const getGoalById = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const goalId = parseInt(req.params.id, 10);
    
    // Get goal from PostgreSQL storage
    const goal = await storage.getSavingsGoal(goalId);
    
    // Check if goal exists and belongs to user
    if (!goal || goal.userId !== userId) {
      return res.status(404).json({ 
        message: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }
    
    // Parse the monthly savings JSON
    let monthlyData = [];
    try {
      monthlyData = JSON.parse(goal.monthlySavings || '[]');
    } catch (error) {
      console.error('Error parsing monthly savings data', error);
    }
    
    // Format goal for client
    const formattedGoal = {
      id: goal.id,
      name: goal.name,
      targetAmount: parseFloat(String(goal.targetAmount)),
      currentAmount: parseFloat(String(goal.currentAmount)),
      targetDate: goal.targetDate,
      progressPercentage: parseFloat(String(goal.progressPercentage)),
      monthlySavings: monthlyData,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    };
    
    res.json(formattedGoal);
  } catch (error: any) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching savings goal',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new savings goal
 */
export const createGoal = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { name, targetAmount, targetDate, currentAmount = 0 } = req.body;
    
    // Validate required fields
    if (!name || !targetAmount) {
      return res.status(400).json({
        message: 'Please provide name and target amount',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Prepare goal data
    const goalData: InsertSavingsGoal = {
      userId,
      name,
      targetAmount: targetAmount.toString(),
      currentAmount: currentAmount.toString(),
      targetDate: targetDate ? new Date(targetDate) : undefined
    };
    
    // Create goal in PostgreSQL
    const goal = await storage.createSavingsGoal(goalData);
    
    // Format goal for client response
    const formattedGoal = {
      id: goal.id,
      name: goal.name,
      targetAmount: parseFloat(String(goal.targetAmount)),
      currentAmount: parseFloat(String(goal.currentAmount)),
      targetDate: goal.targetDate,
      progressPercentage: parseFloat(String(goal.progressPercentage)),
      monthlySavings: JSON.parse(goal.monthlySavings || '[]'),
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    };
    
    res.status(201).json(formattedGoal);
  } catch (error: any) {
    console.error('Error creating goal:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating savings goal',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update a savings goal
 */
export const updateGoal = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const goalId = parseInt(req.params.id, 10);
    const { name, targetAmount, targetDate, amountToAdd } = req.body;
    
    // Get the goal
    const goal = await storage.getSavingsGoal(goalId);
    
    // Check if goal exists and belongs to user
    if (!goal || goal.userId !== userId) {
      return res.status(404).json({ 
        message: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }
    
    // Prepare update data
    const updateData: Record<string, any> = {};
    
    if (name !== undefined) updateData.name = name;
    if (targetAmount !== undefined) updateData.targetAmount = targetAmount.toString();
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    
    // Handle adding to current amount if specified
    if (amountToAdd !== undefined) {
      const currentAmount = parseFloat(String(goal.currentAmount));
      const amountToAddValue = parseFloat(String(amountToAdd));
      updateData.currentAmount = (currentAmount + amountToAddValue).toString();
    }
    
    // Update the goal
    const updatedGoal = await storage.updateSavingsGoal(goalId, updateData);
    
    if (!updatedGoal) {
      return res.status(500).json({
        message: 'Failed to update goal',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Format updated goal for client
    const formattedGoal = {
      id: updatedGoal.id,
      name: updatedGoal.name,
      targetAmount: parseFloat(String(updatedGoal.targetAmount)),
      currentAmount: parseFloat(String(updatedGoal.currentAmount)),
      targetDate: updatedGoal.targetDate,
      progressPercentage: parseFloat(String(updatedGoal.progressPercentage)),
      monthlySavings: JSON.parse(updatedGoal.monthlySavings || '[]'),
      createdAt: updatedGoal.createdAt,
      updatedAt: updatedGoal.updatedAt
    };
    
    res.json(formattedGoal);
  } catch (error: any) {
    console.error('Error updating goal:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating savings goal',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Delete a savings goal
 */
export const deleteGoal = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const goalId = parseInt(req.params.id, 10);
    
    // Get the goal
    const goal = await storage.getSavingsGoal(goalId);
    
    // Check if goal exists and belongs to user
    if (!goal || goal.userId !== userId) {
      return res.status(404).json({ 
        message: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }
    
    // Delete the goal
    const result = await storage.deleteSavingsGoal(goalId);
    
    if (!result) {
      return res.status(500).json({
        message: 'Failed to delete goal',
        code: 'DELETE_FAILED'
      });
    }
    
    res.json({ message: 'Goal deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting savings goal',
      code: 'SERVER_ERROR'
    });
  }
};

// Export a default object with all functions
export default {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal
};