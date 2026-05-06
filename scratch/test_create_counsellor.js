const axios = require('axios');

async function testCreateCounsellor() {
  try {
    // First login as admin to get token
    const loginRes = await axios.post('http://localhost:3000/api/admin/login', {
      gxId: 'GXAD73291673',
      password: 'adminpassword123'
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('Logged in as Admin');

    // Create a counsellor
    const res = await axios.post('http://localhost:3000/api/admin/counsellors', {
      name: 'Test Counsellor',
      email: 'counsellor@test.com',
      phone: '9876543210'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Counsellor Created:', res.data);
  } catch (error) {
    console.error('Failed:', error.response ? error.response.data : error.message);
  }
}

testCreateCounsellor();
