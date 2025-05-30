const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const cookieParser = require('cookie-parser');

// Import controllers
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateDemographics,
  updateLoginMetrics,
  logoutUser,
  loginLimiter
} = require('../controllers/userController');

const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
} = require('../controllers/budgetController');

const {
  getTransactions,
  getTransactionSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markAsNotDuplicate
} = require('../controllers/transactionController');

const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal
} = require('../controllers/goalController');

const { getRivuScore, recalculateRivuScore } = require('../controllers/rivuScoreController');
const { getAdvice } = require('../controllers/adviceController');

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

// Transaction summary endpoint - must come before :id routes to avoid being masked
router.get('/transactions/summary', protect, getTransactionSummary);

router.route('/transactions/:id')
  .put(protect, updateTransaction)
  .delete(protect, deleteTransaction);

// Route to mark a transaction as not a duplicate
router.put('/transactions/:id/not-duplicate', protect, markAsNotDuplicate);

// Goal Routes
router.route('/goals')
  .get(protect, getGoals)
  .post(protect, createGoal);

router.route('/goals/:id')
  .put(protect, updateGoal)
  .delete(protect, deleteGoal);

// Rivu Score Routes
router.get('/rivu-score', protect, getRivuScore);
router.post('/rivu-score/recalculate', protect, recalculateRivuScore);

// AI Advice Route
router.post('/advice', protect, getAdvice);

// Plaid Routes
// Plaid routes have been removed to focus on manual transaction entry only

// Export the router both as a CommonJS module and as ES Module for compatibility
module.exports = router;
export default router;