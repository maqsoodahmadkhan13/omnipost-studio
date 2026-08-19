/**
 * Base Abstract Social Provider Class
 * Defines the contract that all social platforms must fulfill.
 */
export class SocialProvider {
  constructor(platformName) {
    if (new.target === SocialProvider) {
      throw new TypeError('Cannot construct SocialProvider instances directly');
    }
    this.platform = platformName;
  }

  /**
   * Generates OAuth authorization URL or credentials
   */
  async getAuthUrl(state) {
    throw new Error('getAuthUrl() must be implemented');
  }

  /**
   * Exchanges authorization code for access and refresh tokens
   */
  async handleCallback(code) {
    throw new Error('handleCallback() must be implemented');
  }

  /**
   * Fetches manageable social accounts (e.g. Facebook Pages)
   */
  async getAccounts(accessToken) {
    throw new Error('getAccounts() must be implemented');
  }

  /**
   * Publishes post content and media to the platform
   */
  async publishPost(account, postData) {
    throw new Error('publishPost() must be implemented');
  }

  /**
   * Uploads media if separate container upload is required by the API
   */
  async uploadMedia(account, mediaItem) {
    throw new Error('uploadMedia() must be implemented');
  }

  /**
   * Refreshes expired OAuth tokens if supported by the platform
   */
  async refreshToken(refreshToken) {
    throw new Error('refreshToken() must be implemented');
  }

  /**
   * Disconnects / revokes platform authorization
   */
  async disconnect(account) {
    return true;
  }
}
