/**
 * Test script to verify API endpoints are working with JSearch integration
 */

require('dotenv').config();
const axios = require('axios');

const SERVER_URL = process.env.SERVER_DOMAIN || 'http://localhost:4000';

async function testApiEndpoints() {
  console.log('🔍 Testing API endpoints...');
  console.log(`Server URL: ${SERVER_URL}`);
  
  try {
    // Test health endpoint
    console.log('\n❤️  Testing health endpoint...');
    const healthResponse = await axios.get(`${SERVER_URL}/api/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}`);
    
    // Test jobs endpoint (should return external jobs)
    console.log('\n📋 Testing jobs endpoint...');
    const jobsResponse = await axios.get(`${SERVER_URL}/api/jobs?q=software developer`);
    const jobs = jobsResponse.data;
    
    console.log(`✅ Successfully fetched ${jobs.length} jobs`);
    
    if (jobs.length > 0) {
      console.log('\n📄 Sample jobs:');
      jobs.slice(0, 3).forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.title} at ${job.companyName}`);
        console.log(`      Location: ${job.locations ? job.locations.join(', ') : 'N/A'}`);
        console.log(`      External: ${job.isExternal ? 'Yes' : 'No'}`);
        console.log(`      Source: ${job.externalSource || 'Internal'}`);
        console.log('');
      });
      
      // Check if all jobs are external
      const externalJobs = jobs.filter(job => job.isExternal);
      const internalJobs = jobs.filter(job => !job.isExternal);
      
      console.log(`📊 Job sources:`);
      console.log(`   External jobs: ${externalJobs.length}`);
      console.log(`   Internal jobs: ${internalJobs.length}`);
      
      if (internalJobs.length > 0) {
        console.log('⚠️  Found internal jobs - these might be fake jobs that need cleanup');
      } else {
        console.log('✅ All jobs are from external sources!');
      }
    }
    
    // Test jobs endpoint without external jobs
    console.log('\n🚫 Testing jobs endpoint with external jobs disabled...');
    const internalOnlyResponse = await axios.get(`${SERVER_URL}/api/jobs?includeExternal=false`);
    const internalOnlyJobs = internalOnlyResponse.data;
    
    console.log(`📊 Internal-only jobs: ${internalOnlyJobs.length}`);
    
    if (internalOnlyJobs.length === 0) {
      console.log('✅ No internal jobs found - fake jobs successfully removed!');
    } else {
      console.log('⚠️  Found internal jobs - cleanup may be needed');
    }
    
    console.log('\n🎉 API endpoints are working correctly!');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running. Please start the server first:');
      console.error('   cd server && npm start');
    } else {
      console.error('❌ API test failed:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
    }
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testApiEndpoints()
    .then(() => {
      console.log('\n✅ All API tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ API tests failed');
      process.exit(1);
    });
}

module.exports = { testApiEndpoints };
