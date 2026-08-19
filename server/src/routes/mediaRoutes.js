import { Router } from 'express';
import { getAuthParameters } from '../controllers/mediaController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Protected endpoint
router.get('/auth', protect, getAuthParameters);

export default router;
