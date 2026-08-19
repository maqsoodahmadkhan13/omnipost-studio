import axios from 'axios';
import { SocialProvider } from './SocialProvider.js';
import { MockProvider } from './MockProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class LinkedInProvider extends SocialProvider {
  constructor() {
    super('linkedin');
    this.baseUrl = 'https://api.linkedin.com';
    this.mockFallback = new MockProvider('linkedin');
  }

  isConfigured() {
    return Boolean(config.LINKEDIN_CLIENT_ID && config.LINKEDIN_CLIENT_SECRET);
  }

  async getAuthUrl(state) {
    if (!this.isConfigured()) {
      logger.warn('[LinkedInProvider] LinkedIn App credentials not set. Using dev mock flow.');
      return this.mockFallback.getAuthUrl(state);
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.LINKEDIN_CLIENT_ID,
      redirect_uri: config.LINKEDIN_REDIRECT_URI,
      state: state || '',
      scope: 'openid profile email w_member_social'
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!this.isConfigured() || code.startsWith('mock_')) {
      return this.mockFallback.handleCallback(code);
    }

    try {
      // 1. Exchange authorization code for access token
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.LINKEDIN_REDIRECT_URI,
        client_id: config.LINKEDIN_CLIENT_ID,
        client_secret: config.LINKEDIN_CLIENT_SECRET
      });

      const tokenRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = tokenRes.data.access_token;
      const expiresIn = tokenRes.data.expires_in || 5184000;
      const refreshToken = tokenRes.data.refresh_token || null;

      // 2. Fetch authenticated member profile via OpenID userinfo
      const userinfoRes = await axios.get(`${this.baseUrl}/v2/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const member = userinfoRes.data;
      const personUrn = `urn:li:person:${member.sub}`;

      return {
        accessToken,
        refreshToken,
        expiresIn,
        externalAccountId: member.sub,
        accountName: member.name || `${member.given_name || ''} ${member.family_name || ''}`.trim(),
        username: member.email || member.sub,
        metadata: {
          personUrn,
          email: member.email,
          picture: member.picture,
          sub: member.sub
        }
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error_description || error.message;
      logger.error(`[LinkedInProvider] OAuth exchange failed: ${errorMsg}`);
      throw new Error(`LinkedIn connection failed: ${errorMsg}`);
    }
  }

  async publishPost(account, postData) {
    if (!this.isConfigured() || account.metadata?.isMock) {
      return this.mockFallback.publishPost(account, postData);
    }

    try {
      const accessToken = account.accessToken;
      const authorUrn = account.metadata?.personUrn || `urn:li:person:${account.externalAccountId}`;
      const { content, media } = postData;

      // Single image or video attached
      const mediaItem = media && media.length > 0 ? media[0] : null;

      let ugcPayload;

      if (mediaItem && mediaItem.type === 'image') {
        ugcPayload = {
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content || ''
              },
              shareMediaCategory: 'ARTICLE',
              media: [
                {
                  status: 'READY',
                  originalUrl: mediaItem.url,
                  title: {
                    text: mediaItem.fileName || 'Shared Media'
                  }
                }
              ]
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        };
      } else {
        // Text-only Post
        ugcPayload = {
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content || ''
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        };
      }

      const response = await axios.post(`${this.baseUrl}/v2/ugcPosts`, ugcPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        }
      });

      const externalPostId = response.data.id;

      return {
        success: true,
        externalPostId,
        publishedAt: new Date(),
        platformResponse: response.data
      };
    } catch (error) {
      const liError = error.response?.data;
      const message = liError?.message || error.message;
      const serviceErrorCode = liError?.serviceErrorCode || 'LINKEDIN_API_ERROR';

      logger.error(`[LinkedInProvider] Publishing failed: ${message}`, { serviceErrorCode });
      throw new Error(`LinkedIn API Error: ${message}`);
    }
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      return { accessToken: null, expiresIn: 0 };
    }

    try {
      const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.LINKEDIN_CLIENT_ID,
        client_secret: config.LINKEDIN_CLIENT_SECRET
      });

      const tokenRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        accessToken: tokenRes.data.access_token,
        expiresIn: tokenRes.data.expires_in || 5184000
      };
    } catch (error) {
      logger.error(`[LinkedInProvider] Token refresh failed: ${error.message}`);
      throw error;
    }
  }
}
