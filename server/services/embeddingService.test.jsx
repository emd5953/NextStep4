/**
 * Tests for Embedding Service
 * Validates: Requirements 2.2
 */

const EmbeddingService = require('./embeddingService');

describe('EmbeddingService', () => {
  let embeddingService;

  beforeEach(() => {
    embeddingService = new EmbeddingService();
  });

  describe('Constructor', () => {
    test('should initialize with correct model and dimension', () => {
      expect(embeddingService.getModelName()).toBe('text-embedding-004');
      expect(embeddingService.getEmbeddingDimension()).toBe(768);
    });
  });

  describe('embedText', () => {
    test('should generate embedding for valid text', async () => {
      const text = 'This is a test document about NextStep application.';
      const embedding = await embeddingService.embedText(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
      expect(typeof embedding[0]).toBe('number');
    }, 10000); // Increase timeout for API call

    test('should generate different embeddings for different texts', async () => {
      const text1 = 'NextStep is a job matching platform.';
      const text2 = 'The weather is sunny today.';

      const embedding1 = await embeddingService.embedText(text1);
      const embedding2 = await embeddingService.embedText(text2);

      expect(embedding1).not.toEqual(embedding2);
    }, 10000);

    test('should reject empty string', async () => {
      await expect(embeddingService.embedText('')).rejects.toThrow('Text must be a non-empty string');
    });

    test('should reject whitespace-only string', async () => {
      await expect(embeddingService.embedText('   ')).rejects.toThrow('Text must be a non-empty string');
    });

    test('should reject null input', async () => {
      await expect(embeddingService.embedText(null)).rejects.toThrow('Text must be a non-empty string');
    });

    test('should reject undefined input', async () => {
      await expect(embeddingService.embedText(undefined)).rejects.toThrow('Text must be a non-empty string');
    });

    test('should reject non-string input', async () => {
      await expect(embeddingService.embedText(123)).rejects.toThrow('Text must be a non-empty string');
    });
  });

  describe('embedBatch', () => {
    test('should generate embeddings for multiple texts', async () => {
      const texts = [
        'NextStep helps job seekers find opportunities.',
        'The platform uses AI for matching.',
        'Users can browse and apply to jobs.'
      ];

      const embeddings = await embeddingService.embedBatch(texts);

      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(3);
      
      embeddings.forEach(embedding => {
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBe(768);
      });
    }, 15000);

    test('should generate unique embeddings for each text', async () => {
      const texts = [
        'First document about jobs.',
        'Second document about careers.',
        'Third document about employment.'
      ];

      const embeddings = await embeddingService.embedBatch(texts);

      // Check that embeddings are different from each other
      expect(embeddings[0]).not.toEqual(embeddings[1]);
      expect(embeddings[1]).not.toEqual(embeddings[2]);
      expect(embeddings[0]).not.toEqual(embeddings[2]);
    }, 15000);

    test('should reject empty array', async () => {
      const result = await embeddingService.embedBatch([]);
      expect(result).toEqual([]);
    });

    test('should reject non-array input', async () => {
      await expect(embeddingService.embedBatch('not an array')).rejects.toThrow('Texts must be an array');
    });

    test('should reject array with empty string', async () => {
      const texts = ['Valid text', '', 'Another valid text'];
      await expect(embeddingService.embedBatch(texts)).rejects.toThrow('Invalid text at index 1');
    });

    test('should reject array with null value', async () => {
      const texts = ['Valid text', null, 'Another valid text'];
      await expect(embeddingService.embedBatch(texts)).rejects.toThrow('Invalid text at index 1');
    });

    test('should handle single text in array', async () => {
      const texts = ['Single text document.'];
      const embeddings = await embeddingService.embedBatch(texts);

      expect(embeddings.length).toBe(1);
      expect(embeddings[0].length).toBe(768);
    }, 10000);
  });

  describe('Utility Methods', () => {
    test('getEmbeddingDimension should return 768', () => {
      expect(embeddingService.getEmbeddingDimension()).toBe(768);
    });

    test('getModelName should return text-embedding-004', () => {
      expect(embeddingService.getModelName()).toBe('text-embedding-004');
    });
  });
});
