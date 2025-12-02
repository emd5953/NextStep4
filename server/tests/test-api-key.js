require('dotenv').config();
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;

console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
console.log('API Key length:', apiKey ? apiKey.length : 0);

// Try to list models using direct HTTP request
const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

console.log('\nTrying to list models via v1 API...\n');

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 200) {
      const models = JSON.parse(data);
      console.log('\nAvailable models:');
      models.models.forEach(model => {
        if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${model.name}`);
        }
      });
    } else {
      console.log('Error response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
});
