import { storage } from '../storage';
import { InsertNudge } from '@shared/schema';

/**
 * @desc    Get all nudges for the current user
 */
export const getNudges = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { status } = req.query;
    
    // Get nudges from PostgreSQL storage
    const nudges = await storage.getNudges(userId, status);
    
    res.json(nudges);
  } catch (error: any) {
    console.error('Error fetching nudges:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching nudges',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new nudge
 */
export const createNudge = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { type, message, triggerCondition, dueDate } = req.body;
    
    // Validate required fields
    if (!type || !message) {
      return res.status(400).json({ 
        message: 'Please provide nudge type and message',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Prepare nudge data
    const nudgeData: InsertNudge = {
      userId,
      type,
      message,
      status: 'active',
      triggerCondition: triggerCondition ? JSON.stringify(triggerCondition) : JSON.stringify({}),
      dueDate: dueDate ? new Date(dueDate) : undefined
    };
    
    // Create nudge in PostgreSQL
    const nudge = await storage.createNudge(nudgeData);
    
    res.status(201).json(nudge);
  } catch (error: any) {
    console.error('Error creating nudge:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating nudge',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Dismiss a nudge
 */
export const dismissNudge = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const nudgeId = parseInt(req.params.id, 10);
    
    // Get the nudge to verify ownership
    const nudges = await storage.getNudges(userId);
    const nudge = nudges.find(n => n.id === nudgeId);
    
    if (!nudge) {
      return res.status(404).json({ 
        message: 'Nudge not found or does not belong to user',
        code: 'NUDGE_NOT_FOUND'
      });
    }
    
    // Dismiss the nudge
    const result = await storage.dismissNudge(nudgeId);
    
    if (!result) {
      return res.status(500).json({
        message: 'Failed to dismiss nudge',
        code: 'DISMISS_FAILED'
      });
    }
    
    res.json({ message: 'Nudge dismissed successfully' });
  } catch (error: any) {
    console.error('Error dismissing nudge:', error);
    res.status(500).json({ 
      message: error.message || 'Error dismissing nudge',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Complete a nudge
 */
export const completeNudge = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const nudgeId = parseInt(req.params.id, 10);
    
    // Get the nudge to verify ownership
    const nudges = await storage.getNudges(userId);
    const nudge = nudges.find(n => n.id === nudgeId);
    
    if (!nudge) {
      return res.status(404).json({ 
        message: 'Nudge not found or does not belong to user',
        code: 'NUDGE_NOT_FOUND'
      });
    }
    
    // Complete the nudge
    const result = await storage.completeNudge(nudgeId);
    
    if (!result) {
      return res.status(500).json({
        message: 'Failed to complete nudge',
        code: 'COMPLETE_FAILED'
      });
    }
    
    res.json({ message: 'Nudge completed successfully' });
  } catch (error: any) {
    console.error('Error completing nudge:', error);
    res.status(500).json({ 
      message: error.message || 'Error completing nudge',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Check for new nudges and create them
 */
export const checkAndCreateNudges = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Check for and create new nudges
    const newNudges = await storage.checkAndCreateNudges(userId);
    
    res.json({ 
      message: `${newNudges.length} new nudges created`,
      nudges: newNudges
    });
  } catch (error: any) {
    console.error('Error checking and creating nudges:', error);
    res.status(500).json({ 
      message: error.message || 'Error checking and creating nudges',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update user onboarding stage
 */
export const updateOnboardingStage = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { stage } = req.body;
    
    // Validate stage
    const validStages = ['new', 'budget_created', 'transaction_added', 'goal_created', 'completed'];
    if (!stage || !validStages.includes(stage)) {
      return res.status(400).json({ 
        message: 'Please provide a valid onboarding stage',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Update onboarding stage
    const user = await storage.updateOnboardingStage(userId, stage);
    
    if (!user) {
      return res.status(500).json({
        message: 'Failed to update onboarding stage',
        code: 'UPDATE_FAILED'
      });
    }
    
    res.json({ 
      message: 'Onboarding stage updated successfully',
      stage,
      onboardingCompleted: user.onboardingCompleted
    });
  } catch (error: any) {
    console.error('Error updating onboarding stage:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating onboarding stage',
      code: 'SERVER_ERROR'
    });
  }
};

// Export a default object with all functions
export default {
  getNudges,
  createNudge,
  dismissNudge,
  completeNudge,
  checkAndCreateNudges,
  updateOnboardingStage
};