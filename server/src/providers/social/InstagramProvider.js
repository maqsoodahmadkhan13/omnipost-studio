import axios from 'axios';
import { SocialProvider } from './SocialProvider.js';
import { MockProvider } from './MockProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class InstagramProvider extends SocialProvider {
  constructor() {
    super('instagram');
    this.graphApiVersion = 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    this.mockFallback = new MockProvider('instagram');
  }

  isConfigured() {
    return Boolean(
      (config.INSTAGRAM_CLIENT_ID || config.FACEBOOK_CLIENT_ID) &&
      (config.INSTAGRAM_CLIENT_SECRET || config.FACEBOOK_CLIENT_SECRET)
    );
  }

  getClientId() {
    return config.INSTAGRAM_CLIENT_ID || config.FACEBOOK_CLIENT_ID;
  }

  getClientSecret() {
    return config.INSTAGRAM_CLIENT_SECRET || config.FACEBOOK_CLIENT_SECRET;
  }

  getRedirectUri() {
    return config.INSTAGRAM_REDIRECT_URI;
  }

  async getAuthUrl(state) {
    if (!this.isConfigured()) {
      logger.warn('[InstagramProvider] Instagram App credentials not set. Using dev mock flow.');
      return this.mockFallback.getAuthUrl(state);
    }

    const params = new URLSearchParams({
      client_id: this.getClientId(),
      redirect_uri: this.getRedirectUri(),
      state: state || '',
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
      response_type: 'code'
    });

    return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!this.isConfigured() || code.startsWith('mock_')) {
      return this.mockFallback.handleCallback(code);
    }

    try {
      // 1. Exchange code for access token
      const tokenRes = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: this.getClientId(),
          client_secret: this.getClientSecret(),
          redirect_uri: this.getRedirectUri(),
          code
        }
      });

      const shortLivedToken = tokenRes.data.access_token;

      // 2. Exchange for 60-day long-lived token
      const longLivedRes = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.getClientId(),
          client_secret: this.getClientSecret(),
          fb_exchange_token: shortLivedToken
        }
      });

      const longLivedToken = longLivedRes.data.access_token;
      const expiresIn = longLivedRes.data.expires_in || 5184000;

      // 3. Fetch managed Facebook Pages with connected Instagram Business Account
      const pagesRes = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: longLivedToken,
          fields: 'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}'
        }
      });

      const pages = pagesRes.data.data;
      const pageWithIg = pages?.find((p) => p.instagram_business_account);

      if (!pageWithIg || !pageWithIg.instagram_business_account) {
        throw new Error(
          'No Instagram Professional or Business account found linked to your Facebook Pages. Please link an Instagram Business account in Meta Business Suite.'
        );
      }

      const igAccount = pageWithIg.instagram_business_account;

      return {
        accessToken: pageWithIg.access_token || longLivedToken,
        refreshToken: null,
        expiresIn,
        externalAccountId: igAccount.id,
        accountName: igAccount.name || igAccount.username,
        username: igAccount.username,
        metadata: {
          instagramBusinessId: igAccount.id,
          linkedPageId: pageWithIg.id,
          linkedPageName: pageWithIg.name,
          profilePictureUrl: igAccount.profile_picture_url
        }
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`[InstagramProvider] OAuth exchange failed: ${errorMsg}`);
      throw new Error(`Instagram connection failed: ${errorMsg}`);
    }
  }

  async publishPost(account, postData) {
    if (!this.isConfigured() || account.metadata?.isMock) {
      return this.mockFallback.publishPost(account, postData);
    }

    try {
      const igUserId = account.externalAccountId;
      const accessToken = account.accessToken;
      const { content, media } = postData;

      // Instagram Graph API requires media
      const mediaItem = media && media.length > 0 ? media[0] : null;
      if (!mediaItem) {
        throw new Error('Instagram requires at least one image or video to publish a post.');
      }

      const isVideo = mediaItem.type === 'video';

      // Step 1: Create Instagram media container
      const containerParams = {
        caption: content || '',
        access_token: accessToken
      };

      if (isVideo) {
        containerParams.media_type = 'REELS';
        containerParams.video_url = mediaItem.url;
      } else {
        containerParams.image_url = mediaItem.url;
      }

      const containerRes = await axios.post(
        `${this.baseUrl}/${igUserId}/media`,
        null,
        { params: containerParams }
      );

      const creationId = containerRes.data.id;
      if (!creationId) {
        throw new Error('Failed to create Instagram media container');
      }

      // If video, wait for container status to be READY (up to 30s)
      if (isVideo) {
        let isReady = false;
        let attempts = 0;
        while (!isReady && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          attempts++;
          const statusRes = await axios.get(`${this.baseUrl}/${creationId}`, {
            params: {
              fields: 'status_code',
              access_token: accessToken
            }
          });
          if (statusRes.data.status_code === 'FINISHED') {
            isReady = true;
          } else if (statusRes.data.status_code === 'ERROR') {
            throw new Error('Instagram video processing failed.');
          }
        }
      }

      // Step 2: Publish the media container
      const publishRes = await axios.post(
        `${this.baseUrl}/${igUserId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: accessToken
          }
        }
      );

      const externalPostId = publishRes.data.id;

      return {
        success: true,
        externalPostId,
        publishedAt: new Date(),
        platformResponse: publishRes.data
      };
    } catch (error) {
      const igError = error.response?.data?.error;
      const message = igError?.message || error.message;
      const errorCode = igError?.code?.toString() || 'INSTAGRAM_API_ERROR';

      logger.error(`[InstagramProvider] Publishing failed: ${message}`, { errorCode });
      throw new Error(`Instagram API Error (${errorCode}): ${message}`);
    }
  }

  async refreshToken(refreshToken) {
    return { accessToken: null, expiresIn: 0 };
  }
}
