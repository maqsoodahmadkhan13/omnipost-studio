import { Router } from 'express';
import {
  getConnectedAccounts,
  getConnectUrl,
  handleCallback,
  disconnectAccount,
  connectMockAccount
} from '../controllers/socialController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Callback endpoint (can be redirected directly from social providers)
router.get('/:platform/callback', handleCallback);

// Protected endpoints
router.use(protect);

router.get('/', getConnectedAccounts);
router.get('/:platform/connect', getConnectUrl);
router.post('/:platform/mock-connect', connectMockAccount);
router.delete('/:id', disconnectAccount);

export default router;
