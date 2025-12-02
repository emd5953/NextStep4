const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/chat
 * Handles chat messages and returns AI responses
 */
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Context for the AI assistant
    const context = `You are an AI assistant for NextStep Help Chat, a job matching platform. 
Only answer questions about NextStep features:
- Job matching and swipe-based job discovery
- Application tracking
- Employer dashboard
- Profile management
- Semantic job search
- Resume upload and analysis

Do not answer questions about coding, recipes, or other unrelated topics. 
Keep responses helpful, concise, and friendly.`;

    const fullPrompt = `${context}\n\nUser: ${message}`;

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    // Generate content
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const botText = response.text();

    res.status(200).json({ response: botText });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    // Handle specific Gemini API errors
    if (error.message?.includes('API key')) {
      return res.status(401).json({ error: 'Invalid API key configuration' });
    }
    
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;