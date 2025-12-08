/**
 * RAG Chat Routes
 * 
 * Defines routes for the RAG-powered chat system.
 * 
 * Validates: Requirements 1.1, 1.4
 */

const express = require('express');
const router = express.Router();
const ragChatController = require('../controllers/ragChatController');

/**
 * POST /api/rag-chat
 * Handles chat messages using RAG (Retrieval-Augmented Generation)
 * 
 * Request body:
 * {
 *   message: string (required) - User's question
 *   conversationHistory: Array (optional) - Previous messages [{role, content}]
 * }
 * 
 * Response:
 * {
 *   response: string - AI-generated response
 *   sources: Array - Source documents used
 *   timestamp: string - ISO timestamp
 * }
 */
router.post('/', ragChatController.handleChatMessage);

/**
 * GET /api/rag-chat/status
 * Get RAG service status and statistics
 * 
 * Response:
 * {
 *   status: string - 'ready' or 'unavailable'
 *   vectorStore: Object - Vector store information
 *   ragService: Object - RAG service configuration
 * }
 */
router.get('/status', ragChatController.getStatus);

/**
 * POST /api/rag-chat/feedback
 * Submit feedback for a chat response
 * 
 * Request body:
 * {
 *   "messageId": "unique-message-id",
 *   "feedback": "positive" | "negative",
 *   "query": "original user query",
 *   "comment": "optional user comment"
 * }
 * 
 * Response:
 * {
 *   "message": "Thank you for your feedback!",
 *   "success": true
 * }
 */
router.post('/feedback', ragChatController.submitFeedback);

module.exports = router;
