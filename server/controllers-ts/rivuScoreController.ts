import { storage } from '../storage';

/**
 * @desc    Get Rivu score for the current user
 */
export const getRivuScore = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // First, ensure score is calculated with latest data
    await storage.calculateRivuScore(userId);
    
    // Get the Rivu score
    const rivuScore = await storage.getRivuScore(userId);
    
    if (!rivuScore) {
      return res.status(404).json({ 
        message: 'Rivu score not found',
        code: 'SCORE_NOT_FOUND'
      });
    }
    
    // Format Rivu score with rating text
    const formattedScore = {
      score: rivuScore.score,
      budgetAdherence: rivuScore.budgetAdherence,
      savingsProgress: rivuScore.savingsProgress,
      weeklyActivity: rivuScore.weeklyActivity,
      rating: getRating(rivuScore.score),
      updatedAt: rivuScore.updatedAt
    };
    
    res.json(formattedScore);
  } catch (error: any) {
    console.error('Error fetching Rivu score:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching Rivu score',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Manually refresh Rivu score calculation
 */
export const refreshRivuScore = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Force a recalculation of the score
    const newScore = await storage.calculateRivuScore(userId);
    
    // Get the updated Rivu score with all metrics
    const rivuScore = await storage.getRivuScore(userId);
    
    if (!rivuScore) {
      return res.status(404).json({ 
        message: 'Failed to refresh Rivu score',
        code: 'SCORE_REFRESH_FAILED'
      });
    }
    
    // Format Rivu score with rating text
    const formattedScore = {
      score: rivuScore.score,
      budgetAdherence: rivuScore.budgetAdherence,
      savingsProgress: rivuScore.savingsProgress,
      weeklyActivity: rivuScore.weeklyActivity,
      rating: getRating(rivuScore.score),
      updatedAt: rivuScore.updatedAt
    };
    
    res.json({
      message: 'Rivu score refreshed successfully',
      score: formattedScore
    });
  } catch (error: any) {
    console.error('Error refreshing Rivu score:', error);
    res.status(500).json({ 
      message: error.message || 'Error refreshing Rivu score',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Calculate and update Rivu score
 */
export const calculateRivuScore = async (userId: number): Promise<number> => {
  try {
    return await storage.calculateRivuScore(userId);
  } catch (error) {
    console.error('Error calculating Rivu score:', error);
    throw error;
  }
};

/**
 * @desc    Get rating text based on Rivu score
 */
function getRating(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Great';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 50) return 'Needs Improvement';
  if (score >= 30) return 'Poor';
  return 'Critical';
}

// Export a default object with all functions
export default {
  getRivuScore,
  refreshRivuScore,
  calculateRivuScore
};