const jobApiService = require('../services/jobApiService.jsx');

async function testJSearchAPI() {
  console.log('Testing JSearch API...');
  
  try {
    const results = await jobApiService.searchJobs({
      query: 'software developer',
      location: 'United States',
      page: 1,
      num_pages: 1
    });
    
    console.log(`✅ JSearch API working! Found ${results.length} jobs`);
    if (results.length > 0) {
      console.log('Sample job:', {
        title: results[0].title,
        company: results[0].companyName,
        location: results[0].locations,
        isExternal: results[0].isExternal
      });
    }
  } catch (error) {
    console.error('❌ JSearch API failed:', error.message);
    console.error('Full error:', error);
  }
}

testJSearchAPI();