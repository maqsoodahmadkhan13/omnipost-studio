import axios from 'axios';
import { SocialProvider } from './SocialProvider.js';
import { MockProvider } from './MockProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class FacebookProvider extends SocialProvider {
  constructor() {
    super('facebook');
    this.graphApiVersion = 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    this.mockFallback = new MockProvider('facebook');
  }

  isConfigured() {
    return Boolean(config.FACEBOOK_CLIENT_ID && config.FACEBOOK_CLIENT_SECRET);
  }

  async getAuthUrl(state) {
    if (!this.isConfigured()) {
      logger.warn('[FacebookProvider] Facebook App credentials not set. Using dev mock flow.');
      return this.mockFallback.getAuthUrl(state);
    }

    const params = new URLSearchParams({
      client_id: config.FACEBOOK_CLIENT_ID,
      redirect_uri: config.FACEBOOK_REDIRECT_URI,
      state: state || '',
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,publish_video,public_profile',
      response_type: 'code'
    });

    return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!this.isConfigured() || code.startsWith('mock_')) {
      return this.mockFallback.handleCallback(code);
    }

    try {
      // 1. Exchange authorization code for short-lived user token
      const tokenRes = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: config.FACEBOOK_CLIENT_ID,
          client_secret: config.FACEBOOK_CLIENT_SECRET,
          redirect_uri: config.FACEBOOK_REDIRECT_URI,
          code
        }
      });

      const shortLivedToken = tokenRes.data.access_token;

      // 2. Exchange for long-lived (60-day) user token
      const longLivedRes = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: config.FACEBOOK_CLIENT_ID,
          client_secret: config.FACEBOOK_CLIENT_SECRET,
          fb_exchange_token: shortLivedToken
        }
      });

      const longLivedToken = longLivedRes.data.access_token;
      const expiresIn = longLivedRes.data.expires_in || 5184000;

      // 3. Fetch managed Facebook Pages
      const pagesRes = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: longLivedToken,
          fields: 'id,name,category,access_token,tasks'
        }
      });

      const pages = pagesRes.data.data;
      if (!pages || pages.length === 0) {
        throw new Error('No Facebook Pages found. You must manage at least one Facebook Page to connect.');
      }

      // Use first managed page (or primary page)
      const primaryPage = pages[0];

      return {
        accessToken: primaryPage.access_token || longLivedToken,
        refreshToken: null,
        expiresIn,
        externalAccountId: primaryPage.id,
        accountName: primaryPage.name,
        username: primaryPage.name.toLowerCase().replace(/\s+/g, '_'),
        metadata: {
          pageId: primaryPage.id,
          pageName: primaryPage.name,
          category: primaryPage.category,
          allPages: pages.map((p) => ({ id: p.id, name: p.name }))
        }
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`[FacebookProvider] OAuth exchange failed: ${errorMsg}`);
      throw new Error(`Facebook connection failed: ${errorMsg}`);
    }
  }

  async publishPost(account, postData) {
    if (!this.isConfigured() || account.metadata?.isMock) {
      return this.mockFallback.publishPost(account, postData);
    }

    try {
      const pageId = account.externalAccountId;
      const accessToken = account.accessToken;
      const { content, media } = postData;

      let response;

      // Check if post includes an image
      const imageMedia = media && media.find((m) => m.type === 'image');

      if (imageMedia) {
        // Publish Photo Post to Facebook Page
        response = await axios.post(`${this.baseUrl}/${pageId}/photos`, null, {
          params: {
            url: imageMedia.url,
            caption: content || '',
            access_token: accessToken
          }
        });
      } else {
        // Publish Text Post to Facebook Page Feed
        response = await axios.post(`${this.baseUrl}/${pageId}/feed`, null, {
          params: {
            message: content || '',
            access_token: accessToken
          }
        });
      }

      const externalPostId = response.data.id || response.data.post_id;

      return {
        success: true,
        externalPostId,
        publishedAt: new Date(),
        platformResponse: response.data
      };
    } catch (error) {
      const fbError = error.response?.data?.error;
      const message = fbError?.message || error.message;
      const errorCode = fbError?.code?.toString() || 'FACEBOOK_API_ERROR';

      logger.error(`[FacebookProvider] Publishing failed: ${message}`, { errorCode });
      throw new Error(`Facebook API Error (${errorCode}): ${message}`);
    }
  }

  async refreshToken(refreshToken) {
    return { accessToken: null, expiresIn: 0 };
  }
}
