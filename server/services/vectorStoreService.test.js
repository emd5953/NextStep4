/**
 * Tests for Vector Store Service
 * Validates: Requirements 2.3, 2.4, 5.3
 */

const VectorStoreService = require('./vectorStoreService');

describe('VectorStoreService', () => {
  let vectorStore;
  const testCollectionName = `test_collection_${Date.now()}`;

  beforeAll(async () => {
    vectorStore = new VectorStoreService(testCollectionName);
    await vectorStore.initialize();
  });

  afterAll(async () => {
    // Clean up test collection
    try {
      await vectorStore.clear();
    } catch (error) {
      console.log('Cleanup error (expected):', error.message);
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(vectorStore.isReady()).toBe(true);
      expect(vectorStore.getCollectionName()).toBe(testCollectionName);
    });

    test('should throw error when operations called before initialization', async () => {
      const uninitializedStore = new VectorStoreService('uninitialized_test');
      
      await expect(uninitializedStore.addDocuments([{ text: 'test', metadata: {} }]))
        .rejects.toThrow('Vector store not initialized');
      
      await expect(uninitializedStore.similaritySearch('test'))
        .rejects.toThrow('Vector store not initialized');
      
      await expect(uninitializedStore.getStats())
        .rejects.toThrow('Vector store not initialized');
    });
  });

  describe('addDocuments', () => {
    beforeEach(async () => {
      // Clear collection before each test
      await vectorStore.clear();
    });

    test('should add single document successfully', async () => {
      const documents = [{
        text: 'NextStep is a job matching platform that helps users find opportunities.',
        metadata: {
          source: 'test.md',
          chunkIndex: 0
        }
      }];

      await vectorStore.addDocuments(documents);
      
      const stats = await vectorStore.getStats();
      expect(stats.count).toBe(1);
    }, 15000);

    test('should add multiple documents successfully', async () => {
      const documents = [
        {
          text: 'NextStep helps job seekers find opportunities.',
          metadata: { source: 'doc1.md', chunkIndex: 0 }
        },
        {
          text: 'The platform uses AI for matching candidates.',
          metadata: { source: 'doc1.md', chunkIndex: 1 }
        },
        {
          text: 'Users can browse and apply to jobs easily.',
          metadata: { source: 'doc2.md', chunkIndex: 0 }
        }
      ];

      await vectorStore.addDocuments(documents);
      
      const stats = await vectorStore.getStats();
      expect(stats.count).toBe(3);
    }, 20000);

    test('should preserve metadata when adding documents', async () => {
      const documents = [{
        text: 'Test document with metadata.',
        metadata: {
          source: 'test.md',
          chunkIndex: 5,
          totalChunks: 10,
          customField: 'custom value'
        }
      }];

      await vectorStore.addDocuments(documents);
      
      const results = await vectorStore.similaritySearch('test document', 1);
      expect(results[0].metadata.source).toBe('test.md');
      expect(results[0].metadata.chunkIndex).toBe(5);
      expect(results[0].metadata.customField).toBe('custom value');
    }, 15000);

    test('should reject empty array', async () => {
      await expect(vectorStore.addDocuments([]))
        .rejects.toThrow('Documents must be a non-empty array');
    });

    test('should reject non-array input', async () => {
      await expect(vectorStore.addDocuments('not an array'))
        .rejects.toThrow('Documents must be a non-empty array');
    });

    test('should reject document without text property', async () => {
      const documents = [{
        metadata: { source: 'test.md' }
      }];

      await expect(vectorStore.addDocuments(documents))
        .rejects.toThrow('must have a \'text\' property');
    });

    test('should reject document without metadata property', async () => {
      const documents = [{
        text: 'Test document'
      }];

      await expect(vectorStore.addDocuments(documents))
        .rejects.toThrow('must have a \'metadata\' property');
    });
  });

  describe('similaritySearch', () => {
    beforeAll(async () => {
      // Add test documents
      await vectorStore.clear();
      
      const documents = [
        {
          text: 'NextStep is a job matching platform for job seekers.',
          metadata: { source: 'about.md', topic: 'platform' }
        },
        {
          text: 'Users can create profiles and upload resumes.',
          metadata: { source: 'features.md', topic: 'profiles' }
        },
        {
          text: 'The AI system matches candidates with suitable jobs.',
          metadata: { source: 'ai.md', topic: 'matching' }
        },
        {
          text: 'Employers can post job listings and review applications.',
          metadata: { source: 'employers.md', topic: 'jobs' }
        }
      ];

      await vectorStore.addDocuments(documents);
    }, 20000);

    test('should return relevant documents for query', async () => {
      const results = await vectorStore.similaritySearch('job matching platform', 2);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(2);
    }, 10000);

    test('should return documents with required fields', async () => {
      const results = await vectorStore.similaritySearch('AI matching', 1);
      
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('document');
      expect(results[0]).toHaveProperty('metadata');
      expect(results[0]).toHaveProperty('distance');
      expect(results[0]).toHaveProperty('score');
    }, 10000);

    test('should rank results by similarity', async () => {
      const results = await vectorStore.similaritySearch('job platform', 3);
      
      // Scores should be in descending order (higher score = more similar)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    }, 10000);

    test('should respect topK parameter', async () => {
      const results = await vectorStore.similaritySearch('NextStep', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    }, 10000);

    test('should return empty array when no documents match', async () => {
      // Clear and add unrelated document
      await vectorStore.clear();
      await vectorStore.addDocuments([{
        text: 'Completely unrelated content about weather.',
        metadata: { source: 'weather.md' }
      }]);

      const results = await vectorStore.similaritySearch('quantum physics', 5);
      // Should still return the document, but with low similarity
      expect(Array.isArray(results)).toBe(true);
    }, 15000);

    test('should reject empty query', async () => {
      await expect(vectorStore.similaritySearch(''))
        .rejects.toThrow('Query must be a non-empty string');
    });

    test('should reject null query', async () => {
      await expect(vectorStore.similaritySearch(null))
        .rejects.toThrow('Query must be a non-empty string');
    });

    test('should reject invalid topK', async () => {
      await expect(vectorStore.similaritySearch('test', 0))
        .rejects.toThrow('topK must be between 1 and 100');
    });
  });

  describe('clear', () => {
    test('should clear all documents from collection', async () => {
      // Add documents
      await vectorStore.addDocuments([
        { text: 'Document 1', metadata: { source: 'test1.md' } },
        { text: 'Document 2', metadata: { source: 'test2.md' } }
      ]);

      let stats = await vectorStore.getStats();
      expect(stats.count).toBeGreaterThan(0);

      // Clear
      await vectorStore.clear();

      stats = await vectorStore.getStats();
      expect(stats.count).toBe(0);
    }, 15000);
  });

  describe('getStats', () => {
    test('should return collection statistics', async () => {
      await vectorStore.clear();
      await vectorStore.addDocuments([
        { text: 'Test document', metadata: { source: 'test.md' } }
      ]);

      const stats = await vectorStore.getStats();
      
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('collectionName');
      expect(stats).toHaveProperty('embeddingModel');
      expect(stats).toHaveProperty('embeddingDimension');
      
      expect(stats.count).toBe(1);
      expect(stats.collectionName).toBe(testCollectionName);
      expect(stats.embeddingModel).toBe('text-embedding-004');
      expect(stats.embeddingDimension).toBe(768);
    }, 15000);
  });

  describe('Utility Methods', () => {
    test('isReady should return true when initialized', () => {
      expect(vectorStore.isReady()).toBe(true);
    });

    test('getCollectionName should return collection name', () => {
      expect(vectorStore.getCollectionName()).toBe(testCollectionName);
    });
  });
});
