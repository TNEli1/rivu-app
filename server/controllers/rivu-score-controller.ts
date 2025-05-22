import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

/**
 * Controller for Rivu Score related operations
 */
export class RivuScoreController {
  /**
   * Get the current Rivu Score for a user
   */
  getScore = async (req: Request, res: Response) => {
    try {
      const userId = Number(req.user?.id);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Calculate fresh score to ensure latest data
      const score = await storage.calculateRivuScore(userId);
      const scoreData = await storage.getRivuScore(userId);

      return res.json({
        score,
        details: scoreData
      });
    } catch (error) {
      console.error('Error getting Rivu Score:', error);
      return res.status(500).json({ error: 'Failed to retrieve Rivu Score' });
    }
  }

  /**
   * Get the Rivu Score history for a user
   */
  getScoreHistory = async (req: Request, res: Response) => {
    try {
      const userId = Number(req.user?.id);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Parse limit parameter if provided
      const limitSchema = z.object({
        limit: z.string().optional().transform(val => val ? parseInt(val) : undefined)
      });
      
      const { limit } = limitSchema.parse(req.query);
      
      // Get score history with optional limit
      const history = await storage.getScoreHistory(userId, limit);

      return res.json({
        history
      });
    } catch (error) {
      console.error('Error getting Rivu Score history:', error);
      return res.status(500).json({ error: 'Failed to retrieve Rivu Score history' });
    }
  }

  /**
   * Manually add a score history entry with a specific reason
   * Used for special events like completing goals or onboarding steps
   */
  addScoreHistoryEntry = async (req: Request, res: Response) => {
    try {
      const userId = Number(req.user?.id);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body
      const bodySchema = z.object({
        reason: z.string(),
        change: z.number().optional(),
        notes: z.string().optional()
      });

      const { reason, change, notes } = bodySchema.parse(req.body);
      
      // Get current score
      const currentScoreData = await storage.getRivuScore(userId);
      if (!currentScoreData) {
        return res.status(404).json({ error: 'Rivu Score not found for user' });
      }

      // Add history entry
      const entry = await storage.addScoreHistoryEntry({
        userId,
        score: currentScoreData.score,
        previousScore: currentScoreData.score - (change || 0),
        change,
        reason,
        notes
      });

      return res.status(201).json(entry);
    } catch (error) {
      console.error('Error adding Rivu Score history entry:', error);
      return res.status(500).json({ error: 'Failed to add Rivu Score history entry' });
    }
  };
}

export const rivuScoreController = new RivuScoreController();