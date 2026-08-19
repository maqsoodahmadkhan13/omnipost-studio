import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { config } from '../src/config/env.js';
import app from '../src/app.js';
import axios from 'axios';
import http from 'http';

const runAuthTests = async () => {
  console.log('--- Starting Auth API Automated Tests ---');
  let server;
  let testPort = 5002;
  const baseUrl = `http://localhost:${testPort}/api/auth`;

  try {
    // 1. Connect DB
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ MongoDB Connected for Test');

    // Clear test users
    await User.deleteMany({ email: /test.*@omnipost\.local/ });

    // 2. Start temporary test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    console.log(`✓ Test server listening on port ${testPort}`);

    // Test 1: Register
    console.log('\n[Test 1] User Registration');
    const regRes = await axios.post(`${baseUrl}/register`, {
      name: 'Test Creator',
      email: 'test_user@omnipost.local',
      password: 'password123',
      timezone: 'America/New_York'
    });
    if (regRes.status === 201 && regRes.data.success && regRes.data.data.user.email === 'test_user@omnipost.local') {
      console.log('✅ Registration Passed:', regRes.data.data.user.name, `(${regRes.data.data.user.timezone})`);
      // Verify passwordHash is NOT returned
      if (regRes.data.data.user.passwordHash === undefined) {
        console.log('✅ Security Check: passwordHash not leaked in response');
      } else {
        throw new Error('SECURITY VIOLATION: passwordHash returned in response');
      }
    } else {
      throw new Error('Registration failed');
    }

    // Test 2: Duplicate registration
    console.log('\n[Test 2] Duplicate Email Prevention');
    try {
      await axios.post(`${baseUrl}/register`, {
        name: 'Another User',
        email: 'test_user@omnipost.local',
        password: 'password456'
      });
      throw new Error('Should have failed with 400 for duplicate email');
    } catch (err) {
      if (err.response?.status === 400 && err.response.data.code === 'EMAIL_EXISTS') {
        console.log('✅ Duplicate Email Correctly Blocked with 400');
      } else {
        throw err;
      }
    }

    // Test 3: Invalid Login
    console.log('\n[Test 3] Invalid Password Handling');
    try {
      await axios.post(`${baseUrl}/login`, {
        email: 'test_user@omnipost.local',
        password: 'wrongpassword'
      });
      throw new Error('Should have failed with 401 for wrong password');
    } catch (err) {
      if (err.response?.status === 401 && err.response.data.code === 'INVALID_CREDENTIALS') {
        console.log('✅ Invalid Login Correctly Blocked with 401');
      } else {
        throw err;
      }
    }

    // Test 4: Successful Login
    console.log('\n[Test 4] Valid User Login');
    const loginRes = await axios.post(`${baseUrl}/login`, {
      email: 'test_user@omnipost.local',
      password: 'password123'
    });
    const token = loginRes.data?.data?.token;
    if (loginRes.status === 200 && token) {
      console.log('✅ Login Succeeded with JWT Token issued');
    } else {
      throw new Error('Login failed to return token');
    }

    // Test 5: Protected Route Access (/api/auth/me)
    console.log('\n[Test 5] Protected Route Access with Bearer Token');
    const meRes = await axios.get(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (meRes.status === 200 && meRes.data?.data?.user?.email === 'test_user@omnipost.local') {
      console.log('✅ Protected /api/auth/me returned authenticated user');
    } else {
      throw new Error('Protected route failed');
    }

    // Test 6: Unauthorized Protected Route Access
    console.log('\n[Test 6] Protected Route Access without Token');
    try {
      await axios.get(`${baseUrl}/me`);
      throw new Error('Should have failed with 401');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ Unauthenticated request correctly rejected with 401');
      } else {
        throw err;
      }
    }

    console.log('\n🎉 ALL Phase 2 Authentication Tests Passed Successfully!\n');
  } catch (error) {
    console.error('❌ Test Failure:', error.response?.data || error.message);
    process.exitCode = 1;
  } finally {
    // Cleanup
    await User.deleteMany({ email: /test.*@omnipost\.local/ }).catch(() => {});
    if (server) server.close();
    await mongoose.disconnect().catch(() => {});
    process.exit(process.exitCode || 0);
  }
};

runAuthTests();
