import { Post } from '../../models/Post.js';
import { PostPublication } from '../../models/PostPublication.js';
import { SocialAccount } from '../../models/SocialAccount.js';
import { getProvider } from '../../controllers/socialController.js';
import { logger } from '../../utils/logger.js';

export class PublishingService {
  /**
   * Recalculates and updates the overall post status based on its publications
   */
  static async updatePostOverallStatus(postId) {
    const publications = await PostPublication.find({ postId });
    if (!publications || publications.length === 0) {
      return;
    }

    const statuses = publications.map((p) => p.status);
    const hasPending = statuses.includes('pending') || statuses.includes('publishing');
    const publishedCount = statuses.filter((s) => s === 'published').length;
    const failedCount = statuses.filter((s) => s === 'failed').length;
    const totalCount = statuses.length;

    let overallStatus = 'draft';

    if (hasPending) {
      overallStatus = 'publishing';
    } else if (publishedCount === totalCount) {
      overallStatus = 'published';
    } else if (failedCount === totalCount) {
      overallStatus = 'failed';
    } else if (publishedCount > 0) {
      overallStatus = 'partially_published';
    }

    await Post.findByIdAndUpdate(postId, { status: overallStatus });
    logger.info(`Updated overall post status: ${overallStatus}`, { postId });
    return overallStatus;
  }

  /**
   * Publishes a single publication record with duplicate protection
   */
  static async publishPublication(publicationId) {
    const publication = await PostPublication.findById(publicationId);
    if (!publication) {
      throw new Error(`Publication record ${publicationId} not found`);
    }

    // Duplicate Protection: If already published, do not publish again
    if (publication.status === 'published') {
      logger.warn(`Publication already published, skipping duplicate execution`, {
        publicationId: publication._id,
        platform: publication.platform
      });
      return publication;
    }

    const post = await Post.findById(publication.postId);
    if (!post) {
      throw new Error(`Parent Post ${publication.postId} not found`);
    }

    // Mark publication as publishing
    publication.status = 'publishing';
    publication.lastAttemptAt = new Date();
    await publication.save();

    try {
      // Find connected social account for this user and platform
      let socialAccount = null;
      if (publication.socialAccountId) {
        socialAccount = await SocialAccount.findOne({
          _id: publication.socialAccountId,
          userId: post.userId
        }).select('+accessToken +refreshToken');
      } else {
        socialAccount = await SocialAccount.findOne({
          userId: post.userId,
          platform: publication.platform,
          status: 'connected'
        }).select('+accessToken +refreshToken');
      }

      if (!socialAccount) {
        throw new Error(`No connected ${publication.platform} account found for this user`);
      }

      // Link socialAccountId if not already linked
      if (!publication.socialAccountId) {
        publication.socialAccountId = socialAccount._id;
      }

      // Select provider abstraction
      const provider = getProvider(publication.platform);

      // Invoke platform publishing
      const result = await provider.publishPost(socialAccount, {
        content: post.content,
        media: post.media
      });

      // Update publication record on success
      publication.status = 'published';
      publication.externalPostId = result.externalPostId || `ext_${Date.now()}`;
      publication.publishedAt = result.publishedAt || new Date();
      publication.errorCode = null;
      publication.errorMessage = null;
      await publication.save();

      logger.info(`Successfully published to ${publication.platform}`, {
        postId: post._id,
        publicationId: publication._id,
        platform: publication.platform,
        externalPostId: publication.externalPostId
      });
    } catch (error) {
      publication.status = 'failed';
      publication.errorCode = error.code || 'PUBLICATION_FAILED';
      publication.errorMessage = error.message || 'Failed to publish to platform';
      publication.retryCount = (publication.retryCount || 0) + 1;
      await publication.save();

      logger.error(`Publication to ${publication.platform} failed: ${error.message}`, {
        postId: post._id,
        publicationId: publication._id,
        platform: publication.platform
      });
    }

    // Recalculate parent post status
    await PublishingService.updatePostOverallStatus(post._id);

    return publication;
  }

  /**
   * Publishes all target platforms for a post
   */
  static async publishPost(postId, userId) {
    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
      throw new Error('Post not found or unauthorized');
    }

    if (post.status === 'published') {
      throw new Error('This post is already published');
    }

    // Ensure publications exist for all target platforms
    let publications = await PostPublication.find({ postId: post._id });

    if (publications.length === 0 && post.platforms && post.platforms.length > 0) {
      const newPubs = post.platforms.map((platform) => ({
        postId: post._id,
        platform,
        status: 'pending'
      }));
      publications = await PostPublication.insertMany(newPubs);
    }

    if (publications.length === 0) {
      throw new Error('No target platforms selected for this post');
    }

    // Mark post overall status as publishing
    post.status = 'publishing';
    await post.save();

    // Publish to all platforms (in parallel with independent failure isolation)
    const results = await Promise.allSettled(
      publications.map((pub) => PublishingService.publishPublication(pub._id))
    );

    // Refresh publications and updated post
    const updatedPost = await Post.findById(post._id);
    const updatedPublications = await PostPublication.find({ postId: post._id });

    return {
      post: updatedPost,
      publications: updatedPublications,
      results
    };
  }

  /**
   * Retries only failed publications for a post (or a specific failed platform)
   * Strictly avoids republishing to already published channels.
   */
  static async retryFailedPublications(postId, userId, platform = null) {
    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
      throw new Error('Post not found or unauthorized');
    }

    const query = {
      postId: post._id,
      status: 'failed'
    };

    if (platform) {
      query.platform = platform;
    }

    const failedPublications = await PostPublication.find(query);

    if (failedPublications.length === 0) {
      throw new Error('No failed publications found to retry for this post');
    }

    logger.info(`Retrying ${failedPublications.length} failed publication(s)`, {
      postId: post._id,
      platforms: failedPublications.map((p) => p.platform)
    });

    // Mark post overall status as publishing
    post.status = 'publishing';
    await post.save();

    // Execute retries only for the failed records
    const results = await Promise.allSettled(
      failedPublications.map((pub) => PublishingService.publishPublication(pub._id))
    );

    // Refresh publications and updated post
    const updatedPost = await Post.findById(post._id);
    const updatedPublications = await PostPublication.find({ postId: post._id });

    return {
      post: updatedPost,
      publications: updatedPublications,
      results
    };
  }
}
