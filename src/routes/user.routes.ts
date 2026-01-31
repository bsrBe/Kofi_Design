import { Router } from 'express';
import { getMe, getAllUsers } from '../controllers/user.controller.js';
import { validateTelegramAuth, validateAdminAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

router.get('/me', validateTelegramAuth, getMe);
router.get('/', validateAdminAuth, getAllUsers);

export default router;
