import { Router } from 'express';
import { submitOrderWrapper, getOrder, getOrders, getMyOrders, sendQuote, confirmDeposit, updateStatus, getDashboardStats, createAdminOrder, updateOrder } from '../controllers/order.controller.js';
import { upload } from '../middleware/upload.middleware.js';
import { validateAdminAuth, validateAnyAuth, validateTelegramAuth } from '../middleware/auth.middleware.js';
import { submissionLimiter } from '../middleware/rateLimit.middleware.js';
const router: Router = Router();

// Create new order (with optional file upload)
router.post('/', validateTelegramAuth, submissionLimiter, upload.single('inspirationPhoto'), submitOrderWrapper);

// Get my orders (history)
router.get('/my-orders', validateTelegramAuth, getMyOrders);
router.patch('/:id', validateTelegramAuth, upload.single('inspirationPhoto'), updateOrder);

// Admin Routes
router.post('/manual', validateAdminAuth, createAdminOrder);
router.get('/stats', validateAdminAuth, getDashboardStats);
router.get('/', validateAdminAuth, getOrders);
router.patch('/:id/quote', validateAdminAuth, sendQuote);
router.patch('/:id/confirm-deposit', validateAdminAuth, confirmDeposit);
router.patch('/:id/status', validateAdminAuth, updateStatus);

// Shared Routes
router.get('/:id', validateAnyAuth, getOrder);

export default router;
