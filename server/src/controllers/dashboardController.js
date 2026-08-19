import { Post } from '../models/Post.js';
import { SocialAccount } from '../models/SocialAccount.js';
import { PostPublication } from '../models/PostPublication.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalPosts,
      scheduledPostsCount,
      publishedPostsCount,
      failedPostsCount,
      postsThisMonth,
      connectedAccountsCount,
      upcomingPosts,
      recentPosts
    ] = await Promise.all([
      Post.countDocuments({ userId }),
      Post.countDocuments({ userId, status: 'scheduled' }),
      Post.countDocuments({ userId, status: 'published' }),
      Post.countDocuments({ userId, status: { $in: ['failed', 'partially_published'] } }),
      Post.countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
      SocialAccount.countDocuments({ userId, status: 'connected' }),
      Post.find({ userId, status: 'scheduled', scheduledAt: { $gte: new Date() } })
        .sort({ scheduledAt: 1 })
        .limit(5),
      Post.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(6)
    ]);

    // Attach publications to recent posts for platform breakdown
    const recentPostIds = recentPosts.map((p) => p._id);
    const publications = await PostPublication.find({ postId: { $in: recentPostIds } });

    const recentPostsWithPubs = recentPosts.map((post) => {
      const p = post.toJSON();
      p.publications = publications.filter(
        (pub) => pub.postId.toString() === post._id.toString()
      );
      return p;
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalPosts,
          scheduledPosts: scheduledPostsCount,
          publishedPosts: publishedPostsCount,
          failedPosts: failedPostsCount,
          postsThisMonth,
          connectedAccounts: connectedAccountsCount
        },
        upcomingPosts,
        recentActivity: recentPostsWithPubs
      }
    });
  } catch (error) {
    next(error);
  }
};
