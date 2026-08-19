import { SocialAccount } from '../models/SocialAccount.js';
import { FacebookProvider } from '../providers/social/FacebookProvider.js';
import { InstagramProvider } from '../providers/social/InstagramProvider.js';
import { LinkedInProvider } from '../providers/social/LinkedInProvider.js';
import { MockProvider } from '../providers/social/MockProvider.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

// Provider factory helper
export const getProvider = (platform) => {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return new FacebookProvider();
    case 'instagram':
      return new InstagramProvider();
    case 'linkedin':
      return new LinkedInProvider();
    default:
      return new MockProvider(platform);
  }
};

export const getConnectedAccounts = async (req, res, next) => {
  try {
    const accounts = await SocialAccount.find({
      userId: req.user._id,
      status: { $ne: 'disconnected' }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        accounts
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getConnectUrl = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const provider = getProvider(platform);

    const state = JSON.stringify({
      userId: req.user._id.toString(),
      platform,
      random: Math.random().toString(36).substring(7)
    });

    const encodedState = Buffer.from(state).toString('base64');
    const authUrl = await provider.getAuthUrl(encodedState);

    res.status(200).json({
      success: true,
      data: {
        authUrl,
        platform
      }
    });
  } catch (error) {
    next(error);
  }
};

export const handleCallback = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.error(`OAuth error received from ${platform}: ${error_description || error}`);
      return res.redirect(`${config.FRONTEND_URL}/accounts?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      return res.redirect(`${config.FRONTEND_URL}/accounts?error=Missing+authorization+code`);
    }

    // Decode state to get userId if available
    let userId = req.user?._id;
    if (!userId && state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
        userId = decodedState.userId;
      } catch (e) {
        logger.warn('Could not decode OAuth state parameter');
      }
    }

    if (!userId) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=Session+expired+during+OAuth`);
    }

    const provider = getProvider(platform);
    const accountData = await provider.handleCallback(code);

    const expiresAt = accountData.expiresIn
      ? new Date(Date.now() + accountData.expiresIn * 1000)
      : null;

    // Upsert social account in MongoDB
    const socialAccount = await SocialAccount.findOneAndUpdate(
      {
        userId,
        platform,
        externalAccountId: accountData.externalAccountId
      },
      {
        userId,
        platform,
        externalAccountId: accountData.externalAccountId,
        accountName: accountData.accountName,
        username: accountData.username || accountData.accountName,
        accessToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
        expiresAt,
        status: 'connected',
        metadata: accountData.metadata || {}
      },
      { upsert: true, new: true, runValidators: true }
    );

    logger.info(`Social account connected: ${platform} - ${accountData.accountName}`, {
      userId,
      platform,
      externalAccountId: accountData.externalAccountId
    });

    res.redirect(`${config.FRONTEND_URL}/accounts?connected=${platform}`);
  } catch (error) {
    logger.error(`OAuth callback handling failed: ${error.message}`);
    res.redirect(`${config.FRONTEND_URL}/accounts?error=${encodeURIComponent(error.message)}`);
  }
};

export const connectMockAccount = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const provider = new MockProvider(platform);
    const accountData = await provider.handleCallback(`mock_${Date.now()}`);

    const socialAccount = await SocialAccount.findOneAndUpdate(
      {
        userId: req.user._id,
        platform,
        externalAccountId: accountData.externalAccountId
      },
      {
        userId: req.user._id,
        platform,
        externalAccountId: accountData.externalAccountId,
        accountName: accountData.accountName,
        username: accountData.username,
        accessToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'connected',
        metadata: accountData.metadata
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: `Connected demo ${platform} account successfully`,
      data: {
        account: socialAccount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const disconnectAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const account = await SocialAccount.findOne({ _id: id, userId: req.user._id });
    if (!account) {
      return next(new AppError('Social account not found', 404, 'ACCOUNT_NOT_FOUND'));
    }

    const provider = getProvider(account.platform);
    await provider.disconnect(account);

    await SocialAccount.findByIdAndDelete(account._id);

    logger.info(`Social account disconnected`, { accountId: id, userId: req.user._id, platform: account.platform });

    res.status(200).json({
      success: true,
      message: `${account.platform} account disconnected successfully`
    });
  } catch (error) {
    next(error);
  }
};
