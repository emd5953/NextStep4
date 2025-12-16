/**
 * Embedding Service
 * 
 * Handles text embedding generation using Google's text-embedding-004 model.
 * Provides methods for single and batch embedding operations with error handling.
 * 
 * Validates: Requirements 2.2
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const ragConfig = require('../config/ragConfig.jsx');

class EmbeddingService {
  /**
   * Initialize embedding service with Google AI
   */
  constructor() {
    this.genAI = new GoogleGenerativeAI(ragConfig.geminiApiKey);
    this.model = ragConfig.embeddingModel;
  }

  /**
   * Generate embedding for a single text
   * 
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} Embedding vector
   * @throws {Error} If text is invalid or embedding generation fails
   * 
   * Validates: Requirements 2.2
   */
  async embedText(text) {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text must be a non-empty string');
    }

    try {
      const embeddingModel = this.genAI.getGenerativeModel({ model: this.model });
      const result = await embeddingModel.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('Invalid embedding response from API');
      }

      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * 
   * @param {Array<string>} texts - Array of texts to embed
   * @param {number} maxRetries - Maximum number of retries per text (default: 1)
   * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
   * @throws {Error} If texts array is invalid or batch processing fails
   * 
   * Validates: Requirements 2.2
   */
  async embedBatch(texts, maxRetries = 1) {
    // Validate input
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }

    if (texts.length === 0) {
      return [];
    }

    // Validate all texts are non-empty strings
    for (let i = 0; i < texts.length; i++) {
      if (!texts[i] || typeof texts[i] !== 'string' || texts[i].trim().length === 0) {
        throw new Error(`Invalid text at index ${i}: must be a non-empty string`);
      }
    }

    const embeddings = [];
    const errors = [];

    // Process each text with retry logic
    for (let i = 0; i < texts.length; i++) {
      let lastError = null;
      let success = false;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const embedding = await this.embedText(texts[i]);
          embeddings.push(embedding);
          success = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            console.warn(`Retry ${attempt + 1}/${maxRetries} for text ${i + 1}/${texts.length}`);
            // Wait before retry (exponential backoff)
            await this._sleep(Math.pow(2, attempt) * 1000);
          }
        }
      }

      if (!success) {
        errors.push({ index: i, error: lastError.message });
        console.error(`Failed to embed text ${i + 1}/${texts.length} after ${maxRetries + 1} attempts`);
      }
    }

    // If any embeddings failed, throw error with details
    if (errors.length > 0) {
      throw new Error(`Failed to embed ${errors.length}/${texts.length} texts: ${JSON.stringify(errors)}`);
    }

    return embeddings;
  }

  /**
   * Get the embedding model name
   * 
   * @returns {string} Model name
   */
  getModelName() {
    return this.model;
  }

  /**
   * Get the embedding dimension size
   * 
   * @returns {number} Embedding dimension (768 for text-embedding-004)
   */
  getEmbeddingDimension() {
    // text-embedding-004 produces 768-dimensional embeddings
    return 768;
  }

  /**
   * Sleep utility for retry backoff
   * 
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EmbeddingService;
