import ImageKit from 'imagekit';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let imagekit = null;

export const getImageKitInstance = () => {
  if (!imagekit) {
    if (!config.IMAGEKIT_PUBLIC_KEY || !config.IMAGEKIT_PRIVATE_KEY || !config.IMAGEKIT_URL_ENDPOINT) {
      logger.warn('ImageKit credentials are not fully configured in environment variables');
    }

    imagekit = new ImageKit({
      publicKey: config.IMAGEKIT_PUBLIC_KEY,
      privateKey: config.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: config.IMAGEKIT_URL_ENDPOINT
    });
  }

  return imagekit;
};
