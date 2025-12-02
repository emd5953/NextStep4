/**
 * Embedding Service
 * 
 * Generates vector embeddings for text using Google's text-embedding-004 model.
 * Embeddings are used for semantic search in the RAG system.
 * 
 * Validates: Requirements 2.2
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const ragConfig = require('../config/ragConfig');

class EmbeddingService {
  /**
   * Initialize embedding service with Google Gemini API
   */
  constructor() {
    this.genAI = new GoogleGenerativeAI(ragConfig.geminiApiKey);
    this.model = ragConfig.embeddingModel;
    this.embeddingDimension = 768; // text-embedding-004 produces 768-dimensional vectors
  }

  /**
   * Generate embedding for a single text
   * 
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector (768 dimensions)
   * @throws {Error} If text is empty or embedding generation fails
   * 
   * Validates: Requirements 2.2
   */
  async embedText(text) {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text must be a non-empty string');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const result = await model.embedContent(text);
      const embedding = result.embedding;

      // Validate embedding dimension
      if (!embedding || !embedding.values || embedding.values.length !== this.embeddingDimension) {
        throw new Error(`Invalid embedding dimension. Expected ${this.embeddingDimension}, got ${embedding?.values?.length || 0}`);
      }

      return embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * 
   * Processes texts sequentially to avoid rate limiting.
   * For large batches, consider implementing rate limiting or parallel processing with limits.
   * 
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   * @throws {Error} If texts array is empty or invalid
   * 
   * Validates: Requirements 2.2
   */
  async embedBatch(texts) {
    // Validate input
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    // Validate all texts are non-empty strings
    for (let i = 0; i < texts.length; i++) {
      if (!texts[i] || typeof texts[i] !== 'string' || texts[i].trim().length === 0) {
        throw new Error(`Invalid text at index ${i}: must be a non-empty string`);
      }
    }

    const embeddings = [];
    const errors = [];

    // Process each text sequentially
    for (let i = 0; i < texts.length; i++) {
      try {
        const embedding = await this.embedText(texts[i]);
        embeddings.push(embedding);
      } catch (error) {
        console.error(`Error embedding text at index ${i}:`, error);
        errors.push({ index: i, error: error.message });
        // Continue processing remaining texts
        embeddings.push(null);
      }
    }

    // If any embeddings failed, throw error with details
    if (errors.length > 0) {
      throw new Error(`Failed to embed ${errors.length} out of ${texts.length} texts: ${JSON.stringify(errors)}`);
    }

    return embeddings;
  }

  /**
   * Get the embedding dimension for this model
   * 
   * @returns {number} Embedding dimension (768 for text-embedding-004)
   */
  getEmbeddingDimension() {
    return this.embeddingDimension;
  }

  /**
   * Get the model name being used
   * 
   * @returns {string} Model name
   */
  getModelName() {
    return this.model;
  }
}

module.exports = EmbeddingService;
