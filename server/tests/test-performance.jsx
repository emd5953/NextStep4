/**
 * Performance Test for RAG Chatbot
 * 
 * Tests response times for various query types
 */

const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:4000';

const testQueries = [
  { query: 'How do I apply to a job?', type: 'documentation', expectedTime: 2000 },
  { query: 'How do I apply to a job?', type: 'cached', expectedTime: 200 },
  { query: 'hi', type: 'greeting', expectedTime: 100 },
  { query: 'hows everything', type: 'small_talk', expectedTime: 100 },
  { query: "What's the weather?", type: 'off_topic', expectedTime: 100 },
  { query: 'How do I withdraw my application?', type: 'documentation', expectedTime: 2000 },
];

async function testQuery(query, expectedType, expectedTime) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}/api/rag-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: query }),
    });

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    const status = responseTime <= expectedTime ? '✅' : '⚠️';
    const speedRating = responseTime < 500 ? '🚀 FAST' : 
                       responseTime < 1500 ? '⚡ GOOD' : 
                       responseTime < 3000 ? '🐢 SLOW' : '❌ TOO SLOW';
    
    console.log(`${status} ${speedRating} [${responseTime}ms / ${expectedTime}ms] ${expectedType}`);
    console.log(`   Query: "${query}"`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Response: "${data.response.substring(0, 80)}..."`);
    console.log('');
    
    return {
      query,
      expectedType,
      actualType: data.type,
      responseTime,
      expectedTime,
      success: responseTime <= expectedTime
    };
  } catch (error) {
    console.error(`❌ ERROR: ${query}`);
    console.error(`   ${error.message}`);
    console.log('');
    return {
      query,
      expectedType,
      error: error.message,
      responseTime: Date.now() - startTime,
      success: false
    };
  }
}

async function runPerformanceTest() {
  console.log('🚀 RAG Chatbot Performance Test\n');
  console.log('='.repeat(80));
  console.log('');
  
  const results = [];
  
  for (const test of testQueries) {
    const result = await testQuery(test.query, test.type, test.expectedTime);
    results.push(result);
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('='.repeat(80));
  console.log('\n📊 Performance Summary\n');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;
  const fastQueries = results.filter(r => r.responseTime < 500).length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${successful} / ${total} (${(successful/total*100).toFixed(0)}%)`);
  console.log(`Average Response Time: ${avgTime.toFixed(0)}ms`);
  console.log(`Fast Responses (<500ms): ${fastQueries} / ${total} (${(fastQueries/total*100).toFixed(0)}%)`);
  console.log('');
  
  // Performance rating
  if (avgTime < 1000 && successful >= total * 0.8) {
    console.log('🎉 EXCELLENT PERFORMANCE!');
  } else if (avgTime < 2000 && successful >= total * 0.7) {
    console.log('✅ GOOD PERFORMANCE');
  } else if (avgTime < 3000) {
    console.log('⚠️  ACCEPTABLE PERFORMANCE');
  } else {
    console.log('❌ NEEDS IMPROVEMENT');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run the test
console.log('Starting performance test...');
console.log('Make sure your server is running on', API_URL);
console.log('');

runPerformanceTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
