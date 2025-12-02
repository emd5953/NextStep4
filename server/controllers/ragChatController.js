/**
 * RAG Chat Controller
 * 
 * Handles chat requests using the RAG (Retrieval-Augmented Generation) system.
 * Integrates vector store retrieval with AI response generation.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3
 */

const RAGService = require('../services/ragService');
const VectorStoreService = require('../services/vectorStoreService');

// Initialize services
let ragService = null;
let vectorStore = null;

/**
 * Initialize RAG services
 * This should be called once when the server starts
 */
async function initializeRAGServices() {
  try {
    console.log('Initializing RAG services...');
    
    // Initialize vector store
    vectorStore = new VectorStoreService();
    await vectorStore.initialize();
    
    // Initialize RAG service
    ragService = new RAGService(vectorStore);
    
    console.log('RAG services initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize RAG services:', error);
    throw error;
  }
}

/**
 * Check if RAG services are initialized
 */
function isInitialized() {
  return ragService !== null && vectorStore !== null && vectorStore.isReady();
}

/**
 * Handle chat message and return AI response with sources
 * 
 * @param {Object} req - Express request object
 * @param {string} req.body.message - User's message
 * @param {Array} req.body.conversationHistory - Optional conversation history
 * @param {Object} res - Express response object
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3
 */
async function handleChatMessage(req, res) {
  try {
    // Check if services are initialized
    if (!isInitialized()) {
      return res.status(503).json({
        error: 'RAG service is not initialized',
        message: 'The chat service is currently unavailable. Please try again later.'
      });
    }

    // Validate request body
    const { message, conversationHistory } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Message is required and must be a non-empty string'
      });
    }

    // Validate conversation history if provided
    if (conversationHistory !== undefined) {
      if (!Array.isArray(conversationHistory)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Conversation history must be an array'
        });
      }

      // Validate each message in history
      for (const msg of conversationHistory) {
        if (!msg.role || !msg.content) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Each conversation history item must have role and content'
          });
        }
      }
    }

    // Truncate message if too long
    const maxMessageLength = 1000;
    const truncatedMessage = message.length > maxMessageLength 
      ? message.substring(0, maxMessageLength) 
      : message;

    // Process conversation history (limit to last 5 messages)
    const history = conversationHistory || [];
    const limitedHistory = history.slice(-5);

    console.log(`Processing chat message: "${truncatedMessage.substring(0, 50)}..."`);

    // Generate response using RAG service
    const result = await ragService.generateResponse(truncatedMessage, limitedHistory);

    // Format response
    const response = {
      response: result.response,
      sources: result.sources,
      timestamp: new Date().toISOString()
    };

    // Log success
    console.log(`Response generated with ${result.sources.length} sources`);

    // Return response
    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in RAG chat controller:', error);

    // Handle specific error types
    if (error.message.includes('Query must be a non-empty string')) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Please provide a valid question'
      });
    }

    if (error.message.includes('Vector store not initialized')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'The chat service is temporarily unavailable. Please try again later.'
      });
    }

    if (error.message.includes('Failed to generate response')) {
      return res.status(500).json({
        error: 'AI generation failed',
        message: 'Failed to generate a response. Please try again.'
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get RAG service status
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getStatus(req, res) {
  try {
    if (!isInitialized()) {
      return res.status(503).json({
        status: 'unavailable',
        message: 'RAG service is not initialized'
      });
    }

    // Get vector store stats
    const stats = await vectorStore.getStats();

    return res.status(200).json({
      status: 'ready',
      vectorStore: {
        initialized: vectorStore.isReady(),
        documentCount: stats.count,
        collectionName: stats.collectionName
      },
      ragService: {
        initialized: ragService !== null,
        similarityThreshold: ragService.getSimilarityThreshold(),
        maxConversationHistory: ragService.getMaxConversationHistory()
      }
    });
  } catch (error) {
    console.error('Error getting RAG status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get service status'
    });
  }
}

module.exports = {
  handleChatMessage,
  getStatus,
  initializeRAGServices,
  isInitialized
};
