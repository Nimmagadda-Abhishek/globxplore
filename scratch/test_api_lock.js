require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
const app = require('../src/app');

async function runTest() {
  let server;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Start express app on dynamic/test port
    const PORT = 4567;
    server = app.listen(PORT, async () => {
      console.log(`Test server running on port ${PORT}`);

      try {
        // 1. Login as Admin to get token
        const loginRes = await axios.post(`http://localhost:${PORT}/api/auth/login`, {
          identifier: 'GXAD73291673',
          password: 'MooN@2026'
        });
        const token = loginRes.data.data.accessToken;
        console.log('Admin logged in.');

        const headers = { Authorization: `Bearer ${token}` };
        const userId = '6a14028f90e5b33e6bdfcde8';
        const User = require('../src/modules/user/model');

        // Helper to run a patch request and return isLocked in DB
        async function testRequest(payload, queryStr = '') {
          try {
            const url = `http://localhost:${PORT}/api/admin/users/${userId}/lock${queryStr}`;
            const res = await axios.patch(url, payload, { headers });
            const dbUser = await User.findById(userId);
            return {
              status: res.status,
              apiResponseIsLocked: res.data.data.isLocked,
              dbIsLocked: dbUser.isLocked
            };
          } catch (err) {
            console.error('Request failed:', err.response ? err.response.data : err.message);
            throw err;
          }
        }

        // Test 1: Lock with boolean true
        console.log('\n[Test 1] Lock with boolean true:');
        let res = await testRequest({ isLocked: true });
        console.log(`Result: DB locked = ${res.dbIsLocked} (Expected: true)`);

        // Test 2: Unlock with boolean false
        console.log('\n[Test 2] Unlock with boolean false:');
        res = await testRequest({ isLocked: false });
        console.log(`Result: DB locked = ${res.dbIsLocked} (Expected: false)`);

        // Test 3: Lock with string "true"
        console.log('\n[Test 3] Lock with string "true":');
        res = await testRequest({ isLocked: 'true' });
        console.log(`Result: DB locked = ${res.dbIsLocked} (Expected: true)`);

        // Test 4: Unlock with string "false"
        console.log('\n[Test 4] Unlock with string "false":');
        res = await testRequest({ isLocked: 'false' });
        console.log(`Result: DB locked = ${res.dbIsLocked} (Expected: false)`);

        // Test 5: Lock with NO body at all (should default to true)
        console.log('\n[Test 5] Lock with empty body (default):');
        res = await testRequest({});
        console.log(`Result: DB locked = ${res.dbIsLocked} (Expected: true)`);

        // Test 6: Unlock with query parameter ?isLocked=false (empty body)
        console.log('\n[Test 6] Unlock with query param false:');
        res = await testRequest({}, '?isLocked=false');
        console.log(`Result: DB locked = ${res.dbIsLocked} (Expected: false)`);

        // Test 7: Lock with query parameter ?isLocked=true (empty body)
        console.log('\n[Test 7] Lock with query param true:');
        res = await testRequest({}, '?isLocked=true');
        console.log(`Result: DB locked = ${res.dbIsLocked} (Expected: true)`);

        // Unlock at the end to leave DB clean
        await testRequest({ isLocked: false });

      } catch (err) {
        console.error('Test suite encountered an error.');
      } finally {
        server.close();
        await mongoose.disconnect();
        console.log('\nServer and Mongo disconnected.');
      }
    });
  } catch (err) {
    console.error('Mongoose connection failed:', err);
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTest();
