import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const PUBLISHING_QUEUE_NAME = 'publishing-queue';

let publishingQueue = null;

export const getPublishingQueue = () => {
  if (!publishingQueue) {
    const redis = getRedisClient();
    publishingQueue = new Queue(PUBLISHING_QUEUE_NAME, {
      connection: redis
    });

    publishingQueue.on('error', (err) => {
      logger.error(`BullMQ Queue Error: ${err.message}`);
    });
  }

  return publishingQueue;
};

/**
 * Adds an immediate publishing job to the queue
 */
export const queueImmediatePublish = async (postId, userId) => {
  try {
    const queue = getPublishingQueue();
    const job = await queue.add(
      'publish-post',
      { postId, userId },
      {
        jobId: `post_${postId}_${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    logger.info(`Enqueued immediate publishing job`, { postId, jobId: job.id });
    return job;
  } catch (error) {
    logger.error(`Failed to enqueue immediate publish job: ${error.message}`, { postId });
    throw error;
  }
};

/**
 * Adds a delayed publishing job to the queue
 */
export const queueDelayedPublish = async (postId, userId, delayMs, scheduledAt) => {
  try {
    const queue = getPublishingQueue();
    const jobId = `post_scheduled_${postId}`;

    // Remove existing delayed job for this post if one exists
    try {
      const existingJob = await queue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        logger.info(`Replaced existing scheduled queue job`, { postId, jobId });
      }
    } catch (e) {
      // Ignore if job didn't exist
    }

    const job = await queue.add(
      'publish-post',
      { postId, userId, scheduledAt },
      {
        jobId,
        delay: Math.max(delayMs, 0),
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    logger.info(`Enqueued delayed publishing job (delay: ${delayMs}ms)`, {
      postId,
      jobId: job.id,
      scheduledAt
    });

    return job;
  } catch (error) {
    logger.error(`Failed to enqueue delayed publish job: ${error.message}`, { postId });
    throw error;
  }
};

/**
 * Removes a scheduled job from the queue (e.g. on post cancellation or deletion)
 */
export const cancelScheduledJob = async (postId) => {
  try {
    const queue = getPublishingQueue();
    const jobId = `post_scheduled_${postId}`;
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Cancelled scheduled queue job`, { postId, jobId });
      return true;
    }
    return false;
  } catch (error) {
    logger.warn(`Could not cancel queue job for post ${postId}: ${error.message}`);
    return false;
  }
};
