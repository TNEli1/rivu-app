import { storage } from '../storage';
import { InsertBudgetCategory } from '@shared/schema';

/**
 * @desc    Get all budget categories for the current user
 */
export const getBudgets = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Get budget categories from PostgreSQL storage
    const categories = await storage.getBudgetCategories(userId);
    
    // Format budget categories for client consistency
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      budgetAmount: parseFloat(String(category.budgetAmount)),
      spentAmount: parseFloat(String(category.spentAmount)),
      createdAt: category.createdAt
    }));
    
    res.json(formattedCategories);
  } catch (error: any) {
    console.error('Error fetching budget categories:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching budget categories',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get a single budget category by ID
 */
export const getBudgetById = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const categoryId = parseInt(req.params.id, 10);
    
    // Get budget category from PostgreSQL storage
    const category = await storage.getBudgetCategory(categoryId);
    
    // Check if category exists and belongs to user
    if (!category || category.userId !== userId) {
      return res.status(404).json({ 
        message: 'Budget category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    // Format category for client
    const formattedCategory = {
      id: category.id,
      name: category.name,
      budgetAmount: parseFloat(String(category.budgetAmount)),
      spentAmount: parseFloat(String(category.spentAmount)),
      createdAt: category.createdAt
    };
    
    res.json(formattedCategory);
  } catch (error: any) {
    console.error('Error fetching budget category:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching budget category',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new budget category
 */
export const createBudget = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { name, budgetAmount, color, icon } = req.body;
    
    // Validate required fields
    if (!name || !budgetAmount) {
      return res.status(400).json({ 
        message: 'Please provide category name and budget amount',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Check if a budget for this category already exists
    const existingCategories = await storage.getBudgetCategories(userId);
    const categoryExists = existingCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
    
    if (categoryExists) {
      return res.status(400).json({ 
        message: 'Budget category with this name already exists',
        code: 'CATEGORY_EXISTS'
      });
    }
    
    // Prepare category data
    const categoryData: InsertBudgetCategory = {
      userId,
      name,
      budgetAmount: budgetAmount.toString()
    };
    
    // Create budget category in PostgreSQL
    const category = await storage.createBudgetCategory(categoryData);
    
    // Update user's lastBudgetUpdateDate to track activity for nudge system
    await storage.updateUser(userId, {
      lastBudgetUpdateDate: new Date()
    });
    
    // Also update user's onboarding stage if they're still in onboarding
    const user = await storage.getUser(userId);
    if (user && user.onboardingStage === 'new') {
      await storage.updateOnboardingStage(userId, 'budget_created');
    }
    
    // Format category for client response
    const formattedCategory = {
      id: category.id,
      name: category.name,
      budgetAmount: parseFloat(String(category.budgetAmount)),
      spentAmount: parseFloat(String(category.spentAmount)),
      createdAt: category.createdAt
    };
    
    res.status(201).json(formattedCategory);
  } catch (error: any) {
    console.error('Error creating budget category:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating budget category',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update a budget category
 */
export const updateBudget = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const categoryId = parseInt(req.params.id, 10);
    const { name, budgetAmount, spentAmount, color, icon } = req.body;
    
    // Get the category
    const category = await storage.getBudgetCategory(categoryId);
    
    // Check if category exists and belongs to user
    if (!category || category.userId !== userId) {
      return res.status(404).json({ 
        message: 'Budget category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    // If changing name, check if the new name already exists
    if (name && name !== category.name) {
      const existingCategories = await storage.getBudgetCategories(userId);
      const nameExists = existingCategories.some(c => 
        c.id !== categoryId && c.name.toLowerCase() === name.toLowerCase()
      );
      
      if (nameExists) {
        return res.status(400).json({ 
          message: 'Budget category with this name already exists',
          code: 'CATEGORY_EXISTS'
        });
      }
    }
    
    // Prepare update data
    const updateData: Record<string, any> = {};
    
    if (name !== undefined) updateData.name = name;
    if (budgetAmount !== undefined) updateData.budgetAmount = budgetAmount.toString();
    if (spentAmount !== undefined) updateData.spentAmount = spentAmount.toString();
    
    // Update the category
    const updatedCategory = await storage.updateBudgetCategory(categoryId, updateData);
    
    if (!updatedCategory) {
      return res.status(500).json({
        message: 'Failed to update budget category',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Update user's lastBudgetUpdateDate to track activity for nudge system
    await storage.updateUser(userId, {
      lastBudgetUpdateDate: new Date()
    });
    
    // If the spent amount or budget amount was updated, trigger a Rivu score recalculation
    if (updateData.spentAmount !== undefined || updateData.budgetAmount !== undefined) {
      await storage.calculateRivuScore(userId);
    }
    
    // Format updated category for client
    const formattedCategory = {
      id: updatedCategory.id,
      name: updatedCategory.name,
      budgetAmount: parseFloat(String(updatedCategory.budgetAmount)),
      spentAmount: parseFloat(String(updatedCategory.spentAmount)),
      createdAt: updatedCategory.createdAt
    };
    
    res.json(formattedCategory);
  } catch (error: any) {
    console.error('Error updating budget category:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating budget category',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Delete a budget category
 */
export const deleteBudget = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const categoryId = parseInt(req.params.id, 10);
    
    // Get the category
    const category = await storage.getBudgetCategory(categoryId);
    
    // Check if category exists and belongs to user
    if (!category || category.userId !== userId) {
      return res.status(404).json({ 
        message: 'Budget category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    // Delete the category
    const result = await storage.deleteBudgetCategory(categoryId);
    
    if (!result) {
      return res.status(500).json({
        message: 'Failed to delete budget category',
        code: 'DELETE_FAILED'
      });
    }
    
    // Update user's lastBudgetUpdateDate to track activity for nudge system
    await storage.updateUser(userId, {
      lastBudgetUpdateDate: new Date()
    });
    
    // Recalculate Rivu score as deleting a budget category affects financial health
    await storage.calculateRivuScore(userId);
    
    res.json({ message: 'Budget category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting budget category:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting budget category',
      code: 'SERVER_ERROR'
    });
  }
};

// Export a default object with all functions
export default {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget
};