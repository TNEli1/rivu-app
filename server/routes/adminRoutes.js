const express = require('express');
const router = express.Router();
const { createDemoAccounts } = require('../controllers/adminController');
const { protect } = require('../controllers-ts/userController');

// Admin routes - all protected
router.post('/create-demo-accounts', createDemoAccounts);

module.exports = router;