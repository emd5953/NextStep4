/**
 * API Statistics Routes
 * Monitor API usage and costs
 */

const express = require('express');
const router = express.Router();
const { getEmbeddingStats } = require('../middleware/genAI.jsx');

/**
 * GET /api/stats
 * Get API usage statistics
 */
router.get('/', async (req, res) => {
  try {
    const embeddingStats = getEmbeddingStats();
    
    // Get RAG stats if available
    let ragStats = { geminiApiCalls: 0, cacheHits: 0, cacheSize: 0, hitRate: '0%' };
    if (req.app.locals.ragService) {
      ragStats = req.app.locals.ragService.getApiStats();
    }
    
    // Calculate estimated costs (approximate)
    const openaiEmbeddingCost = embeddingStats.apiCalls * 0.00002; // $0.02 per 1K tokens, ~1 token per call
    const geminiCost = ragStats.geminiApiCalls * 0.00001; // Approximate Gemini cost
    
    const stats = {
      openai: {
        ...embeddingStats,
        estimatedCost: `$${openaiEmbeddingCost.toFixed(4)}`
      },
      gemini: {
        ...ragStats,
        estimatedCost: `$${geminiCost.toFixed(4)}`
      },
      totalEstimatedCost: `$${(openaiEmbeddingCost + geminiCost).toFixed(4)}`,
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting API stats:', error);
    res.status(500).json({ error: 'Failed to get API statistics' });
  }
});

module.exports = router;
