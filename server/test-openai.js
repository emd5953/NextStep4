require('dotenv').config();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testAPI() {
    try {
        console.log("Testing OpenAI API...");
        console.log("API Key present:", !!process.env.OPENAI_API_KEY);
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: "Say hello!" }],
            max_tokens: 50
        });
        
        console.log("✅ API works!");
        console.log("Response:", response.choices[0].message.content);
    } catch (error) {
        console.error("❌ API error:", error.message);
    }
}

testAPI();