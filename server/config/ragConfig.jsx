/**
 * RAG Chatbot Configuration
 * 
 * This module provides configuration settings for the RAG (Retrieval-Augmented Generation) system.
 * All settings can be overridden via environment variables.
 * 
 * Configuration includes:
 * - Document chunking parameters (size, overlap)
 * - Retrieval settings (count, similarity threshold)
 * - Model selection (embedding, generation)
 * - Conversation history management
 * - Vector store configuration
 */

require('dotenv').config();

/**
 * Validates that a number is within a specified range
 * @param {number} value - The value to validate
 * @param {number} min - Minimum allowed value (inclusive)
 * @param {number} max - Maximum allowed value (inclusive)
 * @param {number} defaultValue - Default value if validation fails
 * @param {string} name - Name of the configuration parameter for error messages
 * @returns {number} The validated value or default
 */
function validateRange(value, min, max, defaultValue, name) {
  const num = parseInt(value);
  if (isNaN(num) || num < min || num > max) {
    if (value !== undefined) {
      console.warn(`Invalid ${name}: ${value}. Must be between ${min} and ${max}. Using default: ${defaultValue}`);
    }
    return defaultValue;
  }
  return num;
}

/**
 * Validates that a percentage is within 0-50%
 * @param {number} value - The percentage value to validate
 * @param {number} defaultValue - Default value if validation fails
 * @param {string} name - Name of the configuration parameter
 * @returns {number} The validated percentage or default
 */
function validatePercentage(value, defaultValue, name) {
  const num = parseInt(value);
  if (isNaN(num) || num < 0 || num > 50) {
    if (value !== undefined) {
      console.warn(`Invalid ${name}: ${value}. Must be between 0 and 50. Using default: ${defaultValue}`);
    }
    return defaultValue;
  }
  return num;
}

/**
 * RAG System Configuration
 * 
 * Validates: Requirements 6.1, 6.2, 6.3
 */
const ragConfig = {
  // Document Chunking Configuration
  // Requirement 6.1: Chunk size must be between 100 and 2000 characters
  chunkSize: validateRange(
    process.env.RAG_CHUNK_SIZE,
    100,
    2000,
    500,
    'chunk size'
  ),

  // Requirement 6.2: Chunk overlap must be between 0 and 50 percent
  chunkOverlap: validatePercentage(
    process.env.RAG_CHUNK_OVERLAP,
    50,
    'chunk overlap'
  ),

  // Retrieval Configuration
  // Requirement 6.3: Retrieval count must be between 1 and 10 chunks
  // 🚀 OPTIMIZATION: Reduced from 4 to 3 for faster retrieval
  retrievalCount: validateRange(
    process.env.RAG_RETRIEVAL_COUNT,
    1,
    10,
    3,
    'retrieval count'
  ),

  // Model Configuration
  embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-004',
  generationModel: process.env.RAG_GENERATION_MODEL || 'gemini-2.5-flash',

  // Conversation History Configuration
  maxConversationHistory: parseInt(process.env.RAG_MAX_HISTORY) || 5,

  // Vector Store Configuration
  chromaHost: process.env.RAG_CHROMA_HOST || 'localhost',
  chromaPort: parseInt(process.env.RAG_CHROMA_PORT) || 8000,
  collectionName: process.env.RAG_COLLECTION_NAME || 'nextstep_docs',

  // Search Configuration
  similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD) || 0.5,

  // API Configuration
  geminiApiKey: process.env.GEMINI_API_KEY,
};

/**
 * Validates the configuration and throws errors for missing required values
 * @throws {Error} If required configuration is missing
 */
function validateConfig() {
  if (!ragConfig.geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required for RAG system');
  }

  // Log configuration (excluding sensitive data)
  console.log('RAG Configuration loaded:', {
    chunkSize: ragConfig.chunkSize,
    chunkOverlap: ragConfig.chunkOverlap,
    retrievalCount: ragConfig.retrievalCount,
    embeddingModel: ragConfig.embeddingModel,
    generationModel: ragConfig.generationModel,
    maxConversationHistory: ragConfig.maxConversationHistory,
    chromaHost: ragConfig.chromaHost,
    chromaPort: ragConfig.chromaPort,
    collectionName: ragConfig.collectionName,
    similarityThreshold: ragConfig.similarityThreshold,
  });
}

// Validate configuration on module load
validateConfig();

module.exports = ragConfig;
