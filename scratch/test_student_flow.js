const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function test() {
  try {
    console.log('--- Starting Student Flow Test ---');

    // 1. Register a student
    console.log('1. Registering student...');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const regRes = await axios.post(`${BASE_URL}/student/register`, {
      fullName: 'John Doe',
      email: `john.doe.${Date.now()}@example.com`,
      phone: `999999${randomSuffix}`,
      interestedCountry: 'Canada',
      loanStatus: 'required'
    });
    console.log('Registration submitted:', regRes.data.message);
    const registrationId = regRes.data.data._id;

    // 2. Login as Admin
    console.log('2. Logging in as Admin...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      gxId: 'GXAD73291673',
      password: 'adminpassword123'
    });
    const adminToken = adminLogin.data.data.accessToken;
    console.log('Admin logged in');

    // 3. Get Pending Registrations
    console.log('3. Getting pending registrations...');
    const pendingRes = await axios.get(`${BASE_URL}/admin/pending-registrations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`Found ${pendingRes.data.data.length} pending registrations`);

    // 4. Approve Student
    console.log('4. Approving student...');
    const approveRes = await axios.patch(`${BASE_URL}/admin/approve-student/${registrationId}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const { user, tempPassword } = approveRes.data.data;
    const { gxId } = user;
    console.log(`Student approved! gxId: ${gxId}, tempPassword: ${tempPassword}`);

    // 5. Login as Student
    console.log('5. Logging in as Student...');
    const studentLogin = await axios.post(`${BASE_URL}/student/login`, {
      gxId,
      password: tempPassword
    });
    const studentToken = studentLogin.data.data.accessToken;
    console.log('Student logged in');

    // 6. Get Dashboard
    console.log('6. Getting Student Dashboard...');
    const dashboardRes = await axios.get(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('Dashboard Data:', JSON.stringify(dashboardRes.data.data, null, 2));

    // 7. Update Profile
    console.log('7. Updating Student Profile...');
    const profileRes = await axios.put(`${BASE_URL}/student/profile`, {
      interestedUniversity: 'University of Toronto',
      interestedLocation: 'Toronto'
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('Profile Updated:', profileRes.data.data.interestedUniversity);

    console.log('--- Test Completed Successfully ---');
  } catch (error) {
    if (error.response) {
      console.error('Test Failed (Response Error):', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Test Failed (No Response):', error.message);
    } else {
      console.error('Test Failed (Setup Error):', error.message);
    }
  }
}

test();
