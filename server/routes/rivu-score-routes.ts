import express from 'express';
import { rivuScoreController } from '../controllers/rivu-score-controller';

const router = express.Router();

// These routes will be protected by authentication middleware
// in the main routes registration

// Get current score
router.get('/score', rivuScoreController.getScore);

// Get score history
router.get('/score/history', rivuScoreController.getScoreHistory);

// Record a manual score change with a reason (e.g., completing a goal)
router.post('/score/history', rivuScoreController.addScoreHistoryEntry);

export const rivuScoreRoutes = router;