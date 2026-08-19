import { Worker } from 'bullmq';
import { connectDB } from '../src/config/db.js';
import { getRedisClient } from '../src/config/redis.js';
import { PublishingService } from '../src/services/publishing/PublishingService.js';
import { PUBLISHING_QUEUE_NAME } from '../src/queues/publishingQueue.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/config/env.js';

logger.info('Initializing OmniPost Studio Dedicated Publishing Worker Process...');

const startWorker = async (retryCount = 0) => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Connect Redis
    const redis = getRedisClient();

    // 3. Instantiate BullMQ Worker
    const worker = new Worker(
      PUBLISHING_QUEUE_NAME,
      async (job) => {
        logger.info(`[Worker] Received job ${job.id} (${job.name})`, {
          jobId: job.id,
          jobName: job.name,
          data: job.data
        });

        const { postId, userId, publicationId } = job.data;

        if (job.name === 'publish-post') {
          if (!postId || !userId) {
            throw new Error('Invalid job payload: postId and userId are required');
          }
          const result = await PublishingService.publishPost(postId, userId);
          logger.info(`[Worker] Finished post publishing job`, {
            jobId: job.id,
            postId,
            overallStatus: result.post.status
          });
          return result;
        }

        if (job.name === 'publish-publication') {
          if (!publicationId) {
            throw new Error('Invalid job payload: publicationId is required');
          }
          const result = await PublishingService.publishPublication(publicationId);
          logger.info(`[Worker] Finished publication job`, {
            jobId: job.id,
            publicationId,
            status: result.status
          });
          return result;
        }

        throw new Error(`Unknown job type: ${job.name}`);
      },
      {
        connection: redis,
        concurrency: 5
      }
    );

    // Event listeners
    worker.on('completed', (job) => {
      logger.info(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`, {
        jobId: job?.id,
        error: err.message
      });
    });

    worker.on('error', (err) => {
      logger.error(`[Worker] Internal worker error: ${err.message}`);
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      logger.info('Shutting down publishing worker process gracefully...');
      await worker.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    logger.info('🚀 OmniPost Studio Publishing Worker is actively listening for BullMQ jobs');
  } catch (error) {
    logger.error(`Publishing Worker startup failed: ${error.message}. Retrying in 5 seconds...`);
    setTimeout(() => startWorker(retryCount + 1), 5000);
  }
};

startWorker();
