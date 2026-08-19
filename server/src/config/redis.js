import { Redis } from 'ioredis';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient = null;

export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 3000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      logger.info(`Redis connected to ${config.REDIS_URL}`);
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis connection failed: ${err.message}`);
    });
  }

  return redisClient;
};

export const redisConnectionOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};
