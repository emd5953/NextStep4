/**
 * Test script to verify JSearch API integration
 */

require('dotenv').config({ path: '../.env' });
const jobApiService = require('../services/jobApiService.jsx');

async function testJSearchAPI() {
  console.log('🔍 Testing JSearch API integration...');
  
  try {
    // Test basic job search
    console.log('\n📋 Testing basic job search...');
    const jobs = await jobApiService.searchJobs({
      query: 'software developer',
      location: 'New York',
      page: 1,
      num_pages: 1
    });
    
    console.log(`✅ Successfully fetched ${jobs.length} jobs`);
    
    if (jobs.length > 0) {
      console.log('\n📄 Sample job:');
      const sampleJob = jobs[0];
      console.log(`   Title: ${sampleJob.title}`);
      console.log(`   Company: ${sampleJob.companyName}`);
      console.log(`   Location: ${sampleJob.locations.join(', ')}`);
      console.log(`   Salary: ${sampleJob.salaryRange}`);
      console.log(`   External: ${sampleJob.isExternal}`);
      console.log(`   Source: ${sampleJob.externalSource}`);
    }
    
    // Test remote jobs search
    console.log('\n🏠 Testing remote jobs search...');
    const remoteJobs = await jobApiService.searchJobs({
      query: 'remote software engineer',
      remote_jobs_only: true,
      page: 1,
      num_pages: 1
    });
    
    console.log(`✅ Successfully fetched ${remoteJobs.length} remote jobs`);
    
    console.log('\n🎉 JSearch API integration is working correctly!');
    
  } catch (error) {
    console.error('❌ JSearch API test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your JSEARCH_API_KEY in .env file');
    console.error('2. Verify your RapidAPI subscription is active');
    console.error('3. Check your internet connection');
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testJSearchAPI()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testJSearchAPI };