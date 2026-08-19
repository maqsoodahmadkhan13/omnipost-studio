import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  publishPost,
  retryPost,
  schedulePost,
  reschedulePost,
  cancelScheduledPost
} from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPostSchema,
  updatePostSchema,
  getPostSchema
} from '../schemas/postSchemas.js';
import {
  scheduleSchema,
  cancelScheduleSchema
} from '../schemas/scheduleSchemas.js';

const router = Router();

// All post routes require authentication
router.use(protect);

router.post('/', validate(createPostSchema), createPost);
router.get('/', getPosts);
router.get('/:id', validate(getPostSchema), getPostById);
router.put('/:id', validate(updatePostSchema), updatePost);
router.delete('/:id', validate(getPostSchema), deletePost);
router.post('/:id/publish', validate(getPostSchema), publishPost);
router.post('/:id/retry', validate(getPostSchema), retryPost);
router.post('/:id/schedule', validate(scheduleSchema), schedulePost);
router.post('/:id/reschedule', validate(scheduleSchema), reschedulePost);
router.post('/:id/cancel', validate(cancelScheduleSchema), cancelScheduledPost);

export default router;
