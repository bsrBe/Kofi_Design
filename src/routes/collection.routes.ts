import { Router } from 'express';
import { addCollectionItem, getCollections, removeCollectionItem, editCollectionItem } from '../controllers/collection.controller.js';
import { upload } from '../middleware/upload.middleware.js';
import { validateAdminAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Public route to view collections
router.get('/', getCollections);

// Admin routes to manage collections
router.post('/', validateAdminAuth, upload.single('photo'), addCollectionItem);
router.put('/:id', validateAdminAuth, upload.single('photo'), editCollectionItem);
router.delete('/:id', validateAdminAuth, removeCollectionItem);

export default router;
