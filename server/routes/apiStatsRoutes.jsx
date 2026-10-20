/**
 * API Statistics Routes
 * Monitor API usage and costs
 */

const express = require('express');
const router = express.Router();
const { getEmbeddingStats } = require('../middleware/genAI.jsx');
const jobApiService = require('../services/jobApiService.jsx');

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
    
    // Get JSearch stats
    const jsearchStats = jobApiService.getCacheStats();
    
    const stats = {
      gemini: {
        ...embeddingStats,
        rag: ragStats,
        estimatedCost: null,
        billingNote: 'Free-tier eligible models. Actual billing and quotas depend on the Google AI Studio project.'
      },
      jsearch: {
        ...jsearchStats,
        estimatedCost: null,
        billingNote: 'Actual usage and billing depend on the selected job API subscription.'
      },
      totalEstimatedCost: null,
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting API stats:', error);
    res.status(500).json({ error: 'Failed to get API statistics' });
  }
});

module.exports = router;
