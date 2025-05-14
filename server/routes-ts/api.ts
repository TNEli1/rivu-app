import express from 'express';
import { protect } from '../middleware/auth.js';
import cookieParser from 'cookie-parser';

// Import controllers (with .js extension for ESM compatibility)
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateDemographics,
  updateLoginMetrics,
  logoutUser,
  loginLimiter
} from '../controllers/userController.js';

import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
} from '../controllers/budgetController.js';

import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactionController.js';

import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal
} from '../controllers/goalController.js';

import { getRivuScore } from '../controllers/rivuScoreController.js';
import { getAdvice } from '../controllers/adviceController.js';

const router = express.Router();

// Use cookie parser to read JWT cookies
router.use(cookieParser());

// Auth Routes
router.post('/register', registerUser);

// Apply rate limiting to login route conditionally based on environment
if (process.env.NODE_ENV === 'production') {
  router.post('/login', loginLimiter, loginUser); // Strict rate limiting in production
} else {
  // In development, apply the relaxed rate limiter
  router.post('/login', loginLimiter, loginUser);
  console.log('⚠️ Using relaxed rate limiting for login endpoint in development mode');
}

router.post('/logout', protect, logoutUser);    // Require authentication for logout
router.get('/user', protect, getUserProfile);
router.put('/user', protect, updateUserProfile);
router.put('/user/demographics', protect, updateDemographics);
router.post('/user/login-metric', protect, updateLoginMetrics);

// Budget Routes
router.route('/budgets')
  .get(protect, getBudgets)
  .post(protect, createBudget);

router.route('/budgets/:id')
  .put(protect, updateBudget)
  .delete(protect, deleteBudget);

// Transaction Routes
router.route('/transactions')
  .get(protect, getTransactions)
  .post(protect, createTransaction);

router.route('/transactions/:id')
  .put(protect, updateTransaction)
  .delete(protect, deleteTransaction);

// Goal Routes
router.route('/goals')
  .get(protect, getGoals)
  .post(protect, createGoal);

router.route('/goals/:id')
  .put(protect, updateGoal)
  .delete(protect, deleteGoal);

// Rivu Score Route
router.get('/rivu-score', protect, getRivuScore);

// AI Advice Route
router.post('/advice', protect, getAdvice);

// Simulated Plaid Route
router.get('/plaid/transactions', protect, (req, res) => {
  // This is a placeholder for future Plaid integration
  // For now, it returns the user's existing transactions
  getTransactions(req, res);
});

export default router;