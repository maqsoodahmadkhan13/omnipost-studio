import { getImageKitInstance } from '../config/imagekit.js';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const getAuthParameters = (req, res, next) => {
  try {
    if (!config.IMAGEKIT_PUBLIC_KEY || !config.IMAGEKIT_PRIVATE_KEY || !config.IMAGEKIT_URL_ENDPOINT) {
      return res.status(200).json({
        success: true,
        data: {
          isConfigured: false,
          message: 'ImageKit credentials not configured in .env. Mock upload enabled.'
        }
      });
    }

    const ik = getImageKitInstance();
    const authenticationParameters = ik.getAuthenticationParameters();

    logger.info('ImageKit upload authentication parameters generated', { userId: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        isConfigured: true,
        publicKey: config.IMAGEKIT_PUBLIC_KEY,
        urlEndpoint: config.IMAGEKIT_URL_ENDPOINT,
        ...authenticationParameters
      }
    });
  } catch (error) {
    logger.error(`Error generating ImageKit auth parameters: ${error.message}`);
    next(new AppError('Failed to generate media upload authentication', 500, 'MEDIA_AUTH_ERROR'));
  }
};
