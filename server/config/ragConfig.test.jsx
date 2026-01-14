/**
 * Tests for RAG Configuration
 * Validates: Requirements 6.1, 6.2, 6.3
 */

describe('RAG Configuration', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear the module cache to reload config with new env vars
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Chunk Size Configuration (Requirement 6.1)', () => {
    test('should accept valid chunk size within range (100-2000)', () => {
      process.env.RAG_CHUNK_SIZE = '1000';
      const config = require('./ragConfig');
      expect(config.chunkSize).toBe(1000);
    });

    test('should use default (500) for chunk size below minimum', () => {
      process.env.RAG_CHUNK_SIZE = '50';
      const config = require('./ragConfig');
      expect(config.chunkSize).toBe(500);
    });

    test('should use default (500) for chunk size above maximum', () => {
      process.env.RAG_CHUNK_SIZE = '3000';
      const config = require('./ragConfig');
      expect(config.chunkSize).toBe(500);
    });

    test('should accept minimum chunk size (100)', () => {
      process.env.RAG_CHUNK_SIZE = '100';
      const config = require('./ragConfig');
      expect(config.chunkSize).toBe(100);
    });

    test('should accept maximum chunk size (2000)', () => {
      process.env.RAG_CHUNK_SIZE = '2000';
      const config = require('./ragConfig');
      expect(config.chunkSize).toBe(2000);
    });
  });

  describe('Chunk Overlap Configuration (Requirement 6.2)', () => {
    test('should accept valid chunk overlap within range (0-50%)', () => {
      process.env.RAG_CHUNK_OVERLAP = '25';
      const config = require('./ragConfig');
      expect(config.chunkOverlap).toBe(25);
    });

    test('should use default (50) for chunk overlap below minimum', () => {
      process.env.RAG_CHUNK_OVERLAP = '-10';
      const config = require('./ragConfig');
      expect(config.chunkOverlap).toBe(50);
    });

    test('should use default (50) for chunk overlap above maximum', () => {
      process.env.RAG_CHUNK_OVERLAP = '75';
      const config = require('./ragConfig');
      expect(config.chunkOverlap).toBe(50);
    });

    test('should accept minimum chunk overlap (0)', () => {
      process.env.RAG_CHUNK_OVERLAP = '0';
      const config = require('./ragConfig');
      expect(config.chunkOverlap).toBe(0);
    });

    test('should accept maximum chunk overlap (50)', () => {
      process.env.RAG_CHUNK_OVERLAP = '50';
      const config = require('./ragConfig');
      expect(config.chunkOverlap).toBe(50);
    });
  });

  describe('Retrieval Count Configuration (Requirement 6.3)', () => {
    test('should accept valid retrieval count within range (1-10)', () => {
      process.env.RAG_RETRIEVAL_COUNT = '5';
      const config = require('./ragConfig');
      expect(config.retrievalCount).toBe(5);
    });

    test('should use default (3) for retrieval count below minimum', () => {
      process.env.RAG_RETRIEVAL_COUNT = '0';
      const config = require('./ragConfig');
      expect(config.retrievalCount).toBe(3);
    });

    test('should use default (3) for retrieval count above maximum', () => {
      process.env.RAG_RETRIEVAL_COUNT = '15';
      const config = require('./ragConfig');
      expect(config.retrievalCount).toBe(3);
    });

    test('should accept minimum retrieval count (1)', () => {
      process.env.RAG_RETRIEVAL_COUNT = '1';
      const config = require('./ragConfig');
      expect(config.retrievalCount).toBe(1);
    });

    test('should accept maximum retrieval count (10)', () => {
      process.env.RAG_RETRIEVAL_COUNT = '10';
      const config = require('./ragConfig');
      expect(config.retrievalCount).toBe(10);
    });
  });

  describe('Default Configuration', () => {
    test('should use default values when environment variables are not set', () => {
      // Clear RAG-specific env vars
      delete process.env.RAG_CHUNK_SIZE;
      delete process.env.RAG_CHUNK_OVERLAP;
      delete process.env.RAG_RETRIEVAL_COUNT;
      
      const config = require('./ragConfig');
      
      expect(config.chunkSize).toBe(500);
      expect(config.chunkOverlap).toBe(50);
      expect(config.retrievalCount).toBe(3);
      expect(config.embeddingModel).toBe('text-embedding-004');
      expect(config.generationModel).toBe('gemini-2.5-flash');
      expect(config.maxConversationHistory).toBe(5);
      expect(config.chromaHost).toBe('localhost');
      expect(config.chromaPort).toBe(8000);
      expect(config.collectionName).toBe('nextstep_docs');
      expect(config.similarityThreshold).toBe(0.5);
    });
  });

  describe('Required Configuration', () => {
    test('should have GEMINI_API_KEY configured', () => {
      const config = require('./ragConfig');
      expect(config.geminiApiKey).toBeDefined();
      expect(config.geminiApiKey).not.toBe('');
    });
  });
});
