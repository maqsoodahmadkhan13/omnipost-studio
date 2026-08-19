import { Post } from '../models/Post.js';
import { PostPublication } from '../models/PostPublication.js';
import { PublishingService } from '../services/publishing/PublishingService.js';
import { queueDelayedPublish, cancelScheduledJob } from '../queues/publishingQueue.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const publishPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await PublishingService.publishPost(id, req.user._id);

    res.status(200).json({
      success: true,
      message: `Publication process completed. Overall status: ${result.post.status}`,
      data: {
        post: result.post,
        publications: result.publications
      }
    });
  } catch (error) {
    next(new AppError(error.message, 400, 'PUBLISH_FAILED'));
  }
};

export const retryPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { platform } = req.body || {};

    const result = await PublishingService.retryFailedPublications(id, req.user._id, platform);

    res.status(200).json({
      success: true,
      message: `Retry completed. Overall status: ${result.post.status}`,
      data: {
        post: result.post,
        publications: result.publications
      }
    });
  } catch (error) {
    next(new AppError(error.message, 400, 'RETRY_FAILED'));
  }
};

export const schedulePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduledAt, timezone } = req.body;

    const post = await Post.findOne({ _id: id, userId: req.user._id });
    if (!post) {
      return next(new AppError('Post not found', 404, 'POST_NOT_FOUND'));
    }

    const scheduledDateUTC = new Date(scheduledAt);
    const delayMs = scheduledDateUTC.getTime() - Date.now();

    if (delayMs <= 0) {
      return next(new AppError('Scheduled time must be in the future', 400, 'INVALID_SCHEDULE_TIME'));
    }

    post.status = 'scheduled';
    post.scheduledAt = scheduledDateUTC;
    if (timezone) post.timezone = timezone;
    await post.save();

    // Ensure publications exist
    if (post.platforms && post.platforms.length > 0) {
      for (const platform of post.platforms) {
        await PostPublication.findOneAndUpdate(
          { postId: post._id, platform },
          { postId: post._id, platform, status: 'pending' },
          { upsert: true, new: true }
        );
      }
    }

    // Queue BullMQ delayed job
    await queueDelayedPublish(post._id, req.user._id, delayMs, scheduledDateUTC);

    const publications = await PostPublication.find({ postId: post._id });

    logger.info(`Post scheduled successfully`, {
      postId: post._id,
      scheduledAt: scheduledDateUTC,
      delayMs
    });

    res.status(200).json({
      success: true,
      message: 'Post scheduled successfully',
      data: {
        post,
        publications
      }
    });
  } catch (error) {
    next(error);
  }
};

export const reschedulePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduledAt, timezone } = req.body;

    const post = await Post.findOne({ _id: id, userId: req.user._id });
    if (!post) {
      return next(new AppError('Post not found', 404, 'POST_NOT_FOUND'));
    }

    if (post.status === 'published' || post.status === 'publishing') {
      return next(new AppError('Cannot reschedule a post that is published or publishing', 400, 'CANNOT_RESCHEDULE'));
    }

    const scheduledDateUTC = new Date(scheduledAt);
    const delayMs = scheduledDateUTC.getTime() - Date.now();

    if (delayMs <= 0) {
      return next(new AppError('Rescheduled time must be in the future', 400, 'INVALID_SCHEDULE_TIME'));
    }

    post.status = 'scheduled';
    post.scheduledAt = scheduledDateUTC;
    if (timezone) post.timezone = timezone;
    await post.save();

    // Cancel old queue job & create new delayed job
    await queueDelayedPublish(post._id, req.user._id, delayMs, scheduledDateUTC);

    logger.info(`Post rescheduled successfully`, {
      postId: post._id,
      scheduledAt: scheduledDateUTC,
      delayMs
    });

    res.status(200).json({
      success: true,
      message: 'Post rescheduled successfully',
      data: {
        post
      }
    });
  } catch (error) {
    next(error);
  }
};

export const cancelScheduledPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findOne({ _id: id, userId: req.user._id });
    if (!post) {
      return next(new AppError('Post not found', 404, 'POST_NOT_FOUND'));
    }

    // Cancel delayed job in Redis / BullMQ
    await cancelScheduledJob(post._id);

    post.status = 'cancelled';
    await post.save();

    await PostPublication.updateMany(
      { postId: post._id, status: 'pending' },
      { status: 'cancelled' }
    );

    logger.info(`Post scheduling cancelled`, { postId: post._id });

    res.status(200).json({
      success: true,
      message: 'Post scheduling cancelled successfully',
      data: {
        post
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createPost = async (req, res, next) => {
  try {
    const { content, media, platforms, status, scheduledAt, timezone } = req.body;

    const post = await Post.create({
      userId: req.user._id,
      content: content || '',
      media: media || [],
      platforms: platforms || [],
      status: status || 'draft',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      timezone: timezone || req.user.timezone || 'UTC'
    });

    // Create publication records for each selected platform
    if (platforms && platforms.length > 0) {
      const pubRecords = platforms.map((platform) => ({
        postId: post._id,
        platform,
        status: status === 'draft' ? 'pending' : 'pending'
      }));
      await PostPublication.insertMany(pubRecords);
    }

    // If post is created directly as scheduled, enqueue delayed job
    if (post.status === 'scheduled' && post.scheduledAt) {
      const delayMs = new Date(post.scheduledAt).getTime() - Date.now();
      if (delayMs > 0) {
        await queueDelayedPublish(post._id, req.user._id, delayMs, post.scheduledAt);
      }
    }

    logger.info(`Post created`, { postId: post._id, userId: req.user._id, status: post.status });

    const publications = await PostPublication.find({ postId: post._id });

    res.status(201).json({
      success: true,
      message: post.status === 'draft' ? 'Draft saved successfully' : 'Post created successfully',
      data: {
        post,
        publications
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;

    const query = { userId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Post.countDocuments(query)
    ]);

    // Attach publications to each post
    const postIds = posts.map((p) => p._id);
    const publications = await PostPublication.find({ postId: { $in: postIds } });

    const postsWithPublications = posts.map((post) => {
      const postObj = post.toJSON();
      postObj.publications = publications.filter(
        (pub) => pub.postId.toString() === post._id.toString()
      );
      return postObj;
    });

    res.status(200).json({
      success: true,
      data: {
        posts: postsWithPublications,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(total / parsedLimit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) {
      return next(new AppError('Post not found', 404, 'POST_NOT_FOUND'));
    }

    const publications = await PostPublication.find({ postId: post._id });

    res.status(200).json({
      success: true,
      data: {
        post,
        publications
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) {
      return next(new AppError('Post not found', 404, 'POST_NOT_FOUND'));
    }

    if (post.status === 'publishing' || post.status === 'published') {
      return next(
        new AppError('Cannot edit a post that is currently publishing or already published', 400, 'CANNOT_EDIT_POST')
      );
    }

    const { content, media, platforms, status, scheduledAt, timezone } = req.body;

    if (content !== undefined) post.content = content;
    if (media !== undefined) post.media = media;
    if (platforms !== undefined) post.platforms = platforms;
    if (status !== undefined) post.status = status;
    if (scheduledAt !== undefined) post.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (timezone !== undefined) post.timezone = timezone;

    await post.save();

    // Sync publications if platforms updated
    if (platforms !== undefined) {
      await PostPublication.deleteMany({ postId: post._id, status: 'pending' });
      if (platforms.length > 0) {
        const pubRecords = platforms.map((platform) => ({
          postId: post._id,
          platform,
          status: 'pending'
        }));
        await PostPublication.insertMany(pubRecords);
      }
    }

    const publications = await PostPublication.find({ postId: post._id });

    logger.info(`Post updated`, { postId: post._id, userId: req.user._id, status: post.status });

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: {
        post,
        publications
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!post) {
      return next(new AppError('Post not found', 404, 'POST_NOT_FOUND'));
    }

    // Cancel any delayed job in BullMQ / Redis
    await cancelScheduledJob(post._id);

    // Delete associated publication records
    await PostPublication.deleteMany({ postId: post._id });

    logger.info(`Post deleted`, { postId: post._id, userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Post and publication records deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
