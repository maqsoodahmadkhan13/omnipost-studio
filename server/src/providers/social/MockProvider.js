import { SocialProvider } from './SocialProvider.js';
import { logger } from '../../utils/logger.js';

export class MockProvider extends SocialProvider {
  constructor(platformName = 'mock') {
    super(platformName);
  }

  async getAuthUrl(state) {
    return `http://localhost:5173/accounts?mock_connect=${this.platform}&state=${state}`;
  }

  async handleCallback(code) {
    logger.info(`[MockProvider] Mock callback handled for platform: ${this.platform}`);
    return {
      accessToken: `mock_access_token_${this.platform}_${Date.now()}`,
      refreshToken: `mock_refresh_token_${this.platform}_${Date.now()}`,
      expiresIn: 5184000, // 60 days
      externalAccountId: `mock_${this.platform}_page_101`,
      accountName: `Demo ${this.platform.charAt(0).toUpperCase() + this.platform.slice(1)} Channel`,
      username: `demo_${this.platform}`,
      metadata: { isMock: true }
    };
  }

  async getAccounts(accessToken) {
    return [
      {
        id: `mock_${this.platform}_page_101`,
        name: `Demo ${this.platform.charAt(0).toUpperCase() + this.platform.slice(1)} Channel`,
        username: `demo_${this.platform}`,
        access_token: `mock_page_token_${this.platform}`
      }
    ];
  }

  async publishPost(account, postData) {
    logger.info(`[MockProvider] Publishing simulated post to ${this.platform}`, {
      accountName: account.accountName,
      contentLength: postData.content?.length || 0,
      mediaCount: postData.media?.length || 0
    });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Support simulating intentional failure with special test phrases
    if (postData.content && postData.content.includes('#fail_test')) {
      throw new Error(`[MOCK_API_ERROR] Simulated failure for ${this.platform}`);
    }

    return {
      success: true,
      externalPostId: `mock_post_${this.platform}_${Date.now()}`,
      publishedAt: new Date(),
      platformResponse: { mock: true, status: 'published' }
    };
  }

  async uploadMedia(account, mediaItem) {
    return {
      mediaId: `mock_media_${Date.now()}`,
      status: 'ready'
    };
  }

  async refreshToken(refreshToken) {
    return {
      accessToken: `mock_refreshed_token_${this.platform}_${Date.now()}`,
      expiresIn: 5184000
    };
  }

  async disconnect(account) {
    logger.info(`[MockProvider] Account disconnected: ${account.accountName}`);
    return true;
  }
}
