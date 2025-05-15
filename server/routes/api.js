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

const { getRivuScore } = require('../controllers/rivuScoreController');
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

// Export the router both as a CommonJS module and as ES Module for compatibility
module.exports = router;
export default router;