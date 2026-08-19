/**
 * OmniPost Studio — Demo Seed Script
 * Creates a demo user with rich, presentation-ready data.
 *
 * Usage:
 *   cd server
 *   node scripts/seed.js
 *
 * Demo Login:
 *   Email:    demo@omnipost.io
 *   Password: Demo@123456
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';

// ─── Models ────────────────────────────────────────────────────────────────────
import { User } from '../src/models/User.js';
import { SocialAccount } from '../src/models/SocialAccount.js';
import { Post } from '../src/models/Post.js';
import { PostPublication } from '../src/models/PostPublication.js';

const DEMO_EMAIL = 'demo@omnipost.io';
const DEMO_PASSWORD = 'Demo@123456';

async function seed() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ MongoDB Connected\n');

    // ── Wipe existing demo data ────────────────────────────────────────────────
    const existing = await User.findOne({ email: DEMO_EMAIL });
    if (existing) {
      await PostPublication.deleteMany({ postId: { $in: (await Post.find({ userId: existing._id })).map(p => p._id) } });
      await Post.deleteMany({ userId: existing._id });
      await SocialAccount.deleteMany({ userId: existing._id });
      await User.deleteOne({ _id: existing._id });
      console.log('✓ Previous demo data cleared\n');
    }

    // ── Create Demo User ──────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const user = await User.create({
      name: 'Alex Rivera',
      email: DEMO_EMAIL,
      passwordHash,
      timezone: 'America/New_York'
    });
    console.log(`✓ Demo user created: ${user.email}`);

    // ── Connected Social Accounts ─────────────────────────────────────────────
    const [fbAccount, igAccount, liAccount] = await SocialAccount.insertMany([
      {
        userId: user._id,
        platform: 'facebook',
        externalAccountId: 'fb_1234567890',
        accountName: 'Alex Rivera Official',
        username: 'alexrivera.official',
        status: 'connected',
        accessToken: 'REDACTED',
        metadata: { followers: 24800, pageCategory: 'Digital Creator' }
      },
      {
        userId: user._id,
        platform: 'instagram',
        externalAccountId: 'ig_9876543210',
        accountName: 'Alex Rivera ✦',
        username: '@alex.creates',
        status: 'connected',
        accessToken: 'REDACTED',
        metadata: { followers: 58200, accountType: 'Business' }
      },
      {
        userId: user._id,
        platform: 'linkedin',
        externalAccountId: 'li_0011223344',
        accountName: 'Alex Rivera',
        username: 'alexrivera',
        status: 'connected',
        accessToken: 'REDACTED',
        metadata: { connections: 3100, headline: 'Product Lead & Digital Creator' }
      }
    ]);
    console.log('✓ 3 Social accounts connected (Facebook, Instagram, LinkedIn)');

    const now = new Date();
    const posts = [];

    // ── 1. Published — Product Launch ─────────────────────────────────────────
    posts.push({
      status: 'published',
      content: '🚀 Thrilled to announce the launch of Luminary — our AI-powered design toolkit built for modern creators. After 8 months of development and 200+ beta testers, it\'s finally here. Link in bio. #ProductLaunch #Design #AI',
      media: [{ url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200', fileId: 'seed_01', fileName: 'luminary_launch.jpg', type: 'image' }],
      platforms: ['facebook', 'instagram', 'linkedin'],
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000)
    });

    // ── 2. Published — Motivational ───────────────────────────────────────────
    posts.push({
      status: 'published',
      content: '"The secret of getting ahead is getting started." — Mark Twain\n\nPosted this on my studio wall 3 years ago. Still the most powerful reminder every morning. 🌅 What keeps you going? Drop it below 👇',
      platforms: ['instagram', 'linkedin'],
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000)
    });

    // ── 3. Published — Behind the Scenes ─────────────────────────────────────
    posts.push({
      status: 'published',
      content: 'Behind the scenes of our Q3 campaign shoot 📸 6 locations, 3 cities, and the best team in the business. The final campaign drops next Thursday — you don\'t want to miss it. Stay tuned! 👀 #BehindTheScenes #ContentCreation',
      media: [{ url: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=1200', fileId: 'seed_02', fileName: 'bts_shoot.jpg', type: 'image' }],
      platforms: ['instagram', 'facebook'],
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000)
    });

    // ── 4. Partially Published — Partnership ─────────────────────────────────
    posts.push({
      status: 'partially_published',
      content: 'Excited to announce our partnership with Notion for Creators! 🤝 We\'re bringing structured workflows to 50,000+ creators in our network. This is just the beginning. Read the full story on our blog. #Partnership #Notion #Creators',
      platforms: ['facebook', 'instagram', 'linkedin'],
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
    });

    // ── 5. Scheduled — Webinar Announcement ──────────────────────────────────
    posts.push({
      status: 'scheduled',
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      content: '📣 FREE Webinar Alert: "Content Strategy for 2025 — What Works, What Doesn\'t"\n\n🗓️ Date: This Friday, 9 AM EST\n💺 Only 200 spots available\n🔗 Register now via link in bio\n\nI\'ll be sharing the exact framework that grew my audience by 340% in 12 months. See you there! ✨',
      platforms: ['facebook', 'instagram', 'linkedin'],
      createdAt: new Date(now - 30 * 60 * 1000),
      updatedAt: new Date(now - 30 * 60 * 1000)
    });

    // ── 6. Scheduled — Product Feature Drop ──────────────────────────────────
    posts.push({
      status: 'scheduled',
      scheduledAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      content: '✨ Dropping something our community has been asking for since Day 1. Batch scheduling is HERE. Schedule 30 days of content in one sitting.\n\nAvailable to all Pro plan users starting Monday. 🎉 #OmniPost #ProductUpdate #ContentCreators',
      media: [{ url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200', fileId: 'seed_03', fileName: 'batch_scheduling.png', type: 'image' }],
      platforms: ['instagram', 'linkedin'],
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000)
    });

    // ── 7. Scheduled — Case Study ─────────────────────────────────────────────
    posts.push({
      status: 'scheduled',
      scheduledAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      content: 'Case Study Drop 📊\nHow @Bloomfield_Design grew from 200 to 18,000 monthly visitors in 90 days using our content calendar system.\n\nThe numbers don\'t lie. Full breakdown in the article 🔗 #CaseStudy #Growth #ContentMarketing',
      platforms: ['linkedin', 'facebook'],
      createdAt: new Date(now - 1 * 60 * 60 * 1000),
      updatedAt: new Date(now - 1 * 60 * 60 * 1000)
    });

    // ── 8. Failed — API Error Simulation ─────────────────────────────────────
    posts.push({
      status: 'failed',
      content: '🌍 World Mental Health Day — a reminder that your feed, following count, and engagement rate say nothing about your worth as a human being. Take breaks. Be kind online. Check on your people. 💚 #MentalHealthAwareness',
      platforms: ['facebook', 'instagram'],
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 4 * 24 * 60 * 60 * 1000)
    });

    // ── 9. Draft — Upcoming Campaign ─────────────────────────────────────────
    posts.push({
      status: 'draft',
      content: '[DRAFT — Review before posting]\n💡 5 Tools I can\'t create without in 2025:\n1. Figma — design system\n2. Notion — content calendar\n3. OmniPost — multi-platform scheduling\n4. Loom — async team updates\n5. Midjourney — visual ideation\n\nWhat\'s in your stack? 🛠️ #CreatorTools #ProductivityStack',
      platforms: ['linkedin', 'instagram'],
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
      updatedAt: new Date(now - 6 * 60 * 60 * 1000)
    });

    // ── 10. Draft — Newsletter Teaser ─────────────────────────────────────────
    posts.push({
      status: 'draft',
      content: '[DRAFT]\nOur October newsletter is dropping next week 📬\n\n→ 3 trends reshaping creator monetisation\n→ How to repurpose 1 video into 12 posts\n→ Interview with a full-time creator earning $20K/month\n\nSubscribe at the link in bio. Free forever 🎁',
      platforms: ['facebook'],
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
      updatedAt: new Date(now - 3 * 60 * 60 * 1000)
    });

    // ── Insert Posts ───────────────────────────────────────────────────────────
    const createdPosts = await Post.insertMany(
      posts.map(p => ({ ...p, userId: user._id }))
    );
    console.log(`✓ ${createdPosts.length} posts created\n`);

    // ── Publications ──────────────────────────────────────────────────────────
    const publications = [];

    // Post 1: All published
    const p1 = createdPosts[0];
    publications.push(
      { postId: p1._id, platform: 'facebook', socialAccountId: fbAccount._id, status: 'published', externalPostId: 'fb_post_101', publishedAt: p1.createdAt },
      { postId: p1._id, platform: 'instagram', socialAccountId: igAccount._id, status: 'published', externalPostId: 'ig_post_101', publishedAt: p1.createdAt },
      { postId: p1._id, platform: 'linkedin', socialAccountId: liAccount._id, status: 'published', externalPostId: 'li_post_101', publishedAt: p1.createdAt }
    );

    // Post 2: Published
    const p2 = createdPosts[1];
    publications.push(
      { postId: p2._id, platform: 'instagram', socialAccountId: igAccount._id, status: 'published', externalPostId: 'ig_post_102', publishedAt: p2.createdAt },
      { postId: p2._id, platform: 'linkedin', socialAccountId: liAccount._id, status: 'published', externalPostId: 'li_post_102', publishedAt: p2.createdAt }
    );

    // Post 3: Published
    const p3 = createdPosts[2];
    publications.push(
      { postId: p3._id, platform: 'instagram', socialAccountId: igAccount._id, status: 'published', externalPostId: 'ig_post_103', publishedAt: p3.createdAt },
      { postId: p3._id, platform: 'facebook', socialAccountId: fbAccount._id, status: 'published', externalPostId: 'fb_post_103', publishedAt: p3.createdAt }
    );

    // Post 4: Partial — FB ok, IG ok, LinkedIn failed
    const p4 = createdPosts[3];
    publications.push(
      { postId: p4._id, platform: 'facebook', socialAccountId: fbAccount._id, status: 'published', externalPostId: 'fb_post_104', publishedAt: p4.createdAt },
      { postId: p4._id, platform: 'instagram', socialAccountId: igAccount._id, status: 'published', externalPostId: 'ig_post_104', publishedAt: p4.createdAt },
      { postId: p4._id, platform: 'linkedin', socialAccountId: liAccount._id, status: 'failed', errorCode: 'RATE_LIMIT_EXCEEDED', errorMessage: 'LinkedIn API rate limit exceeded. Retry after 15 minutes.', retryCount: 1, lastAttemptAt: p4.createdAt }
    );

    // Posts 5, 6, 7: Scheduled — pending publications
    for (const sp of [createdPosts[4], createdPosts[5], createdPosts[6]]) {
      for (const platform of sp.platforms) {
        const acct = platform === 'facebook' ? fbAccount : platform === 'instagram' ? igAccount : liAccount;
        publications.push({ postId: sp._id, platform, socialAccountId: acct._id, status: 'pending' });
      }
    }

    // Post 8: All failed
    const p8 = createdPosts[7];
    publications.push(
      { postId: p8._id, platform: 'facebook', socialAccountId: fbAccount._id, status: 'failed', errorCode: 'TOKEN_EXPIRED', errorMessage: 'Facebook page access token has expired. Please reconnect your account.', retryCount: 2, lastAttemptAt: p8.createdAt },
      { postId: p8._id, platform: 'instagram', socialAccountId: igAccount._id, status: 'failed', errorCode: 'MEDIA_UPLOAD_FAILED', errorMessage: 'Instagram media container creation failed. Image format not supported.', retryCount: 1, lastAttemptAt: p8.createdAt }
    );

    // Posts 9, 10: Drafts — pending publications
    for (const dp of [createdPosts[8], createdPosts[9]]) {
      for (const platform of dp.platforms) {
        const acct = platform === 'facebook' ? fbAccount : platform === 'instagram' ? igAccount : liAccount;
        publications.push({ postId: dp._id, platform, socialAccountId: acct._id, status: 'pending' });
      }
    }

    await PostPublication.insertMany(publications);
    console.log(`✓ ${publications.length} publication records created`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════');
    console.log('  🎉 Demo Seed Complete!');
    console.log('════════════════════════════════════════════');
    console.log(`  📧 Email    : ${DEMO_EMAIL}`);
    console.log(`  🔑 Password : ${DEMO_PASSWORD}`);
    console.log(`  📊 Posts    : ${createdPosts.length} (3 published, 3 scheduled, 1 partial, 1 failed, 2 drafts)`);
    console.log(`  🔗 Accounts : Facebook · Instagram · LinkedIn`);
    console.log('════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed Error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(process.exitCode || 0);
  }
}

seed();
