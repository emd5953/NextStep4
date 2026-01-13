const axios = require('axios');
require('dotenv').config();

async function testJSearchAPIDetailed() {
  console.log('Testing JSearch API with detailed error info...');
  console.log('API Key (first 10 chars):', process.env.JSEARCH_API_KEY?.substring(0, 10) + '...');
  
  try {
    const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
      headers: {
        'X-RapidAPI-Key': process.env.JSEARCH_API_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      params: {
        query: 'software developer',
        page: 1,
        num_pages: 1,
        country: 'US'
      },
      timeout: 8000
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ Found jobs:', response.data.data?.length || 0);
    
  } catch (error) {
    console.error('❌ API Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Message:', error.message);
    console.error('Response Data:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.error('\n🔑 API Key Issue:');
      console.error('- Check if your RapidAPI subscription is active');
      console.error('- Verify the API key is correct');
      console.error('- Make sure you\'re subscribed to the JSearch API on RapidAPI');
    }
  }
}

testJSearchAPIDetailed();