import { Router } from 'express';
import { 
    loginAdmin, 
    createAdmin, 
    getMe, 
    updatePassword, 
    setupSecurity, 
    getSecretQuestion, 
    resetPassword 
} from '../controllers/admin.controller.js';
import { validateAdminAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const router: Router = Router();

router.post('/login', authLimiter, loginAdmin);
router.post('/register', authLimiter, createAdmin);
router.get('/me', validateAdminAuth, getMe);

// Security Routes
router.post('/change-password', validateAdminAuth, updatePassword);
router.post('/setup-security', validateAdminAuth, setupSecurity);
router.post('/forgot-password/question', authLimiter, getSecretQuestion);
router.post('/forgot-password/reset', authLimiter, resetPassword);

export default router;
