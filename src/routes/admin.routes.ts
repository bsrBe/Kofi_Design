import { Router } from 'express';
import { loginAdmin, createAdmin, getMe } from '../controllers/admin.controller.js';
import { validateAdminAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const router: Router = Router();

router.post('/login', authLimiter, loginAdmin);
router.post('/register', authLimiter, createAdmin);
router.get('/me', validateAdminAuth, getMe); // Future

export default router;
