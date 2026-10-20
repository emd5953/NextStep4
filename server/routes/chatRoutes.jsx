const express = require('express');
const router = express.Router();
const { generateText } = require('../services/geminiService.js');

/**
 * POST /api/chat
 * Handles chat messages and returns AI responses
 */
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
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

    const botText = await generateText(fullPrompt);

    res.status(200).json({ response: botText });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    res.status(error.status || 502).json({
      error: error.message || 'Failed to get AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
