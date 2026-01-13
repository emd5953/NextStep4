/**
 * Performance test script for JSearch API optimizations
 */

require('dotenv').config({ path: '../.env' });
const jobApiService = require('../services/jobApiService.jsx');

async function testPerformance() {
  console.log('🚀 Testing JSearch API performance optimizations...\n');
  
  const testQueries = [
    { query: 'software engineer', location: 'New York' },
    { query: 'data scientist', location: 'San Francisco' },
    { query: 'product manager', location: 'Seattle' }
  ];

  for (const searchParams of testQueries) {
    console.log(`📊 Testing: "${searchParams.query}" in ${searchParams.location}`);
    
    // First call (should hit API)
    const start1 = Date.now();
    try {
      const jobs1 = await jobApiService.searchJobs(searchParams);
      const time1 = Date.now() - start1;
      console.log(`   ✅ First call: ${time1}ms (${jobs1.length} jobs) - API call`);
    } catch (error) {
      console.log(`   ❌ First call failed: ${error.message}`);
      continue;
    }
    
    // Second call (should hit cache)
    const start2 = Date.now();
    try {
      const jobs2 = await jobApiService.searchJobs(searchParams);
      const time2 = Date.now() - start2;
      console.log(`   ⚡ Second call: ${time2}ms (${jobs2.length} jobs) - Cached`);
      
      const speedup = Math.round(time1 / time2);
      console.log(`   📈 Speed improvement: ${speedup}x faster\n`);
    } catch (error) {
      console.log(`   ❌ Second call failed: ${error.message}\n`);
    }
  }

  // Test cache statistics
  console.log('📋 Cache Statistics:');
  console.log(jobApiService.getCacheStats());
  
  console.log('\n🎉 Performance test completed!');
}

// Run test if called directly
if (require.main === module) {
  testPerformance()
    .then(() => {
      console.log('\n✅ All performance tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Performance tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testPerformance };