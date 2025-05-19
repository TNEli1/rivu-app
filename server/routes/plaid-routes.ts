import express from 'express';
import { createLinkToken, exchangeToken, getAccounts, handleWebhook, removeItem } from '../controllers/plaid-controller';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected routes (require authentication)
router.post('/create_link_token', protect, createLinkToken);
router.post('/exchange_token', protect, exchangeToken);
router.post('/accounts', protect, getAccounts);
router.post('/item/remove', protect, removeItem);

// Public webhook route (needs to be accessible by Plaid)
router.post('/webhook', handleWebhook);

export default router;