const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiAPI() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Try different model names
  const modelNames = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'models/gemini-pro',
    'models/gemini-1.5-pro'
  ];
  
  for (const modelName of modelNames) {
    try {
      console.log(`\nTrying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ SUCCESS with ${modelName}`);
      console.log(`Response: ${text.substring(0, 50)}...`);
      break; // Stop after first success
    } catch (error) {
      console.log(`❌ FAILED with ${modelName}: ${error.message}`);
    }
  }
}

testGeminiAPI();
