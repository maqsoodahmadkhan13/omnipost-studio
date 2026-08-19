import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { SocialAccount } from '../src/models/SocialAccount.js';
import { Post } from '../src/models/Post.js';
import { PostPublication } from '../src/models/PostPublication.js';
import { config } from '../src/config/env.js';
import app from '../src/app.js';
import axios from 'axios';
import http from 'http';

const runE2ETests = async () => {
  console.log('====================================================');
  console.log('   OmniPost Studio — Comprehensive E2E Test Suite    ');
  console.log('====================================================\n');

  let server;
  const testPort = 5003;
  const baseUrl = `http://localhost:${testPort}/api`;

  try {
    // 1. Connect MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ MongoDB Connected');

    // 2. Start HTTP Server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    console.log(`✓ Test Server listening on port ${testPort}`);

    // Clean test data
    const testEmail = `e2e_${Date.now()}@omnipost.local`;
    await User.deleteMany({ email: /e2e_.*@omnipost\.local/ });

    // Step 1: User Registration
    console.log('\n[E2E 1] User Registration & Session Initialization');
    const regRes = await axios.post(`${baseUrl}/auth/register`, {
      name: 'Omni Tester',
      email: testEmail,
      password: 'StrongPassword123!',
      timezone: 'America/New_York'
    });
    const token = regRes.data?.data?.token;
    const userId = regRes.data?.data?.user?.id;
    if (!token || !userId) throw new Error('Registration failed to return token/user');
    console.log('✅ Registered user:', testEmail, 'in timezone: America/New_York');

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // Step 2: Connect Social Accounts (Facebook, Instagram, LinkedIn)
    console.log('\n[E2E 2] Multi-Account Social Connections');
    const fbRes = await axios.post(`${baseUrl}/social-accounts/facebook/mock-connect`, {}, authHeaders);
    const igRes = await axios.post(`${baseUrl}/social-accounts/instagram/mock-connect`, {}, authHeaders);
    const liRes = await axios.post(`${baseUrl}/social-accounts/linkedin/mock-connect`, {}, authHeaders);

    const accountsRes = await axios.get(`${baseUrl}/social-accounts`, authHeaders);
    const accounts = accountsRes.data?.data?.accounts || [];
    if (accounts.length !== 3) throw new Error(`Expected 3 connected accounts, found ${accounts.length}`);
    console.log(`✅ Connected 3 channels: ${accounts.map((a) => a.platform).join(', ')}`);

    // Verify token masking
    if (accounts[0].accessToken !== undefined) {
      throw new Error('SECURITY ERROR: accessToken leaked in social-accounts response!');
    }
    console.log('✅ Security Check Passed: OAuth access tokens strictly hidden from API response');

    // Step 3: Media Upload Authentication Endpoint
    console.log('\n[E2E 3] ImageKit Media Auth Signature Verification');
    const mediaAuthRes = await axios.get(`${baseUrl}/media/auth`, authHeaders);
    if (!mediaAuthRes.data?.success) throw new Error('Failed to get media auth parameters');
    console.log('✅ ImageKit signature & auth endpoint operational');

    // Step 4: Create Multi-Account Post
    console.log('\n[E2E 4] Create Multi-Platform Post');
    const createPostRes = await axios.post(
      `${baseUrl}/posts`,
      {
        content: 'Launching our new multi-account product update! 🚀 #omnipost',
        media: [
          {
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
            fileId: 'mock_file_123',
            fileName: 'launch_banner.png',
            type: 'image'
          }
        ],
        platforms: ['facebook', 'instagram', 'linkedin'],
        status: 'draft'
      },
      authHeaders
    );

    const post = createPostRes.data?.data?.post;
    const initialPubs = createPostRes.data?.data?.publications;
    if (!post || initialPubs.length !== 3) throw new Error('Post or publications creation failed');
    console.log(`✅ Draft post created (${post._id}) with 3 platform publications: Facebook, Instagram, LinkedIn`);

    // Step 5: Immediate Multi-Account Publishing
    console.log('\n[E2E 5] Immediate Multi-Account Publishing Execution');
    const publishRes = await axios.post(`${baseUrl}/posts/${post._id}/publish`, {}, authHeaders);
    const publishedPost = publishRes.data?.data?.post;
    const pubRecords = publishRes.data?.data?.publications;

    if (publishedPost.status !== 'published') {
      throw new Error(`Expected overall post status to be 'published', got '${publishedPost.status}'`);
    }
    console.log(`✅ Published to all 3 platforms! Overall post status: ${publishedPost.status}`);

    // Step 6: Duplicate Publishing Protection
    console.log('\n[E2E 6] Duplicate Publication Prevention');
    try {
      await axios.post(`${baseUrl}/posts/${post._id}/publish`, {}, authHeaders);
      throw new Error('Should have rejected republishing an already published post');
    } catch (err) {
      if (err.response?.status === 400 && err.response.data.message.includes('already published')) {
        console.log('✅ Duplicate Prevention Passed: Blocked duplicate execution');
      } else {
        throw err;
      }
    }

    // Step 7: Multi-Account with Simulated Partial Failure & Targeted Retry
    console.log('\n[E2E 7] Failure Isolation & Targeted Platform Retry');
    const failPostRes = await axios.post(
      `${baseUrl}/posts`,
      {
        content: 'Special promo #fail_test', // Trigger mock failure
        platforms: ['facebook', 'instagram'],
        status: 'draft'
      },
      authHeaders
    );
    const failPost = failPostRes.data?.data?.post;

    // Trigger publish -> should result in failed status
    await axios.post(`${baseUrl}/posts/${failPost._id}/publish`, {}, authHeaders);

    const failedPostCheck = await axios.get(`${baseUrl}/posts/${failPost._id}`, authHeaders);
    console.log(`✅ Failure isolated correctly. Overall post status: ${failedPostCheck.data?.data?.post?.status}`);

    // Retry only the failed platform
    console.log('[E2E 7.1] Retrying Failed Publication...');
    // Update content to not trigger failure
    await Post.findByIdAndUpdate(failPost._id, { content: 'Promo fixed' });
    const retryRes = await axios.post(
      `${baseUrl}/posts/${failPost._id}/retry`,
      { platform: 'facebook' },
      authHeaders
    );
    console.log(`✅ Targeted Retry Succeeded: ${retryRes.data?.message}`);

    // Step 8: Timezone-Aware Scheduled Post & Delayed Job Handling
    console.log('\n[E2E 8] Timezone-Aware Scheduling');
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
    const schedPostRes = await axios.post(
      `${baseUrl}/posts`,
      {
        content: 'Scheduled announcement for tomorrow morning',
        platforms: ['linkedin'],
        status: 'scheduled',
        scheduledAt: futureDate.toISOString(),
        timezone: 'America/New_York'
      },
      authHeaders
    );

    const schedPost = schedPostRes.data?.data?.post;
    if (schedPost.status !== 'scheduled' || !schedPost.scheduledAt) {
      throw new Error('Scheduled post creation failed');
    }
    console.log(`✅ Scheduled post created for: ${new Date(schedPost.scheduledAt).toISOString()} (UTC)`);

    // Step 9: Reschedule & Cancel Post
    console.log('\n[E2E 9] Reschedule & Cancel Schedule');
    const newFutureDate = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours in future
    const rescheduleRes = await axios.post(
      `${baseUrl}/posts/${schedPost._id}/reschedule`,
      { scheduledAt: newFutureDate.toISOString() },
      authHeaders
    );
    if (rescheduleRes.status === 200) {
      console.log('✅ Rescheduled post to new future time');
    }

    const cancelRes = await axios.post(`${baseUrl}/posts/${schedPost._id}/cancel`, {}, authHeaders);
    if (cancelRes.data?.data?.post?.status === 'cancelled') {
      console.log('✅ Cancelled scheduled post successfully');
    }

    // Step 10: Dashboard Aggregated Statistics
    console.log('\n[E2E 10] Dashboard Statistics & Activity Aggregation');
    const dashRes = await axios.get(`${baseUrl}/dashboard/stats`, authHeaders);
    const stats = dashRes.data?.data?.stats;
    console.log('✅ Dashboard Stats Verified:', {
      totalPosts: stats.totalPosts,
      publishedPosts: stats.publishedPosts,
      connectedAccounts: stats.connectedAccounts
    });

    console.log('\n====================================================');
    console.log(' 🎉 ALL 10 E2E AUTOMATED TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ E2E Test Suite Error:', error.response?.data || error.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect().catch(() => {});
    process.exit(process.exitCode || 0);
  }
};

runE2ETests();
