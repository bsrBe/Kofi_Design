import { Router } from 'express';
import { 
    createRevisionWrapper, 
    getRevision, 
    getOrderRevisions,
    getAllRevisionsWrapper,
    getPendingRevisionsWrapper,
    updateRevisionStatusWrapper,
    getRevisionsByUserWrapper
} from '../controllers/revision.controller.js';
import { validateTelegramAuth, validateAdminAuth, validateAnyAuth } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { submissionLimiter } from '../middleware/rateLimit.middleware.js';

const router: Router = Router();

// --- Admin Routes ---
// Must come before generic /:id routes to avoid collision
router.get('/admin/all', validateAdminAuth, getAllRevisionsWrapper);
router.get('/admin/pending', validateAdminAuth, getPendingRevisionsWrapper);
router.get('/admin/user/:userId', validateAdminAuth, getRevisionsByUserWrapper);
router.patch('/admin/status/:id', validateAdminAuth, updateRevisionStatusWrapper);

// --- User Routes ---
// Protected by Telegram Auth
router.post('/:orderId', validateTelegramAuth, submissionLimiter, upload.single('photo'), createRevisionWrapper);

// --- Shared Routes (Admin or User) ---
router.get('/order/:orderId', validateAnyAuth, getOrderRevisions);
router.get('/:id', validateAnyAuth, getRevision); 

export default router;