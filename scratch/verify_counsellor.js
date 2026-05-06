const axios = require('axios');

async function verifyCounsellorModule() {
  try {
    const baseURL = 'http://localhost:3000/api/counsellor';
    
    // 1. Login as counsellor
    console.log('Logging in as Counsellor...');
    const loginRes = await axios.post(`${baseURL}/login`, {
      gxId: 'GXCO79347225',
      password: 'e72df30c'
    });
    const token = loginRes.data.data.accessToken;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Login Success.');

    // 2. Get interested leads
    console.log('Fetching interested leads...');
    const leadsRes = await axios.get(`${baseURL}/leads/interested`, config);
    const lead = leadsRes.data.data.find(l => l.gxId === 'GXLD999999');
    if (!lead) throw new Error('Seeded lead not found in interested list');
    console.log(`Found lead: ${lead.name}`);

    // 3. Claim lead
    console.log(`Claiming lead ${lead._id}...`);
    const claimRes = await axios.post(`${baseURL}/leads/${lead._id}/claim`, {}, config);
    const student = claimRes.data.data;
    console.log(`Lead claimed. New Student GXST ID: ${student.gxId}`);

    // 4. Update pipeline stage
    console.log(`Updating stage to contacted for student ${student._id}...`);
    const stageRes = await axios.patch(`${baseURL}/students/${student._id}/stage`, {
      stage: 'contacted',
      comment: 'Spoke with student, interested in UK universities.'
    }, config);
    console.log('Stage updated successfully:', stageRes.data.data.pipelineStage);

    // 5. Get student timeline
    console.log('Fetching student timeline...');
    const timelineRes = await axios.get(`${baseURL}/students/${student._id}/timeline`, config);
    console.log('Timeline:', JSON.stringify(timelineRes.data.data, null, 2));

    console.log('VERIFICATION COMPLETE: ALL CORE FLOWS WORKING.');
  } catch (error) {
    console.error('Verification Failed:', error.response ? error.response.data : error.message);
  }
}

verifyCounsellorModule();
