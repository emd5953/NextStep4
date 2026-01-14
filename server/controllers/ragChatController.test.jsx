/**
 * Tests for RAG Chat Controller
 * Validates: Requirements 1.1, 1.4, 4.1
 */

const ragChatController = require('./ragChatController');

// Mock services
jest.mock('../services/ragService');
jest.mock('../services/vectorStoreService');

const RAGService = require('../services/ragService');
const VectorStoreService = require('../services/vectorStoreService');

describe('RAG Chat Controller', () => {
  let mockReq;
  let mockRes;
  let mockRAGService;
  let mockVectorStore;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      body: {},
      user: { id: 'test-user' },
      app: {
        locals: {
          db: {}
        }
      }
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {}
    };

    // Mock RAG service
    mockRAGService = {
      generateResponse: jest.fn(),
      getSimilarityThreshold: jest.fn().mockReturnValue(0.5),
      getMaxConversationHistory: jest.fn().mockReturnValue(5)
    };

    // Mock vector store
    mockVectorStore = {
      initialize: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockResolvedValue({
        count: 10,
        collectionName: 'test_collection'
      })
    };

    // Set up constructor mocks
    RAGService.mockImplementation(() => mockRAGService);
    VectorStoreService.mockImplementation(() => mockVectorStore);

    // Initialize services for tests
    await ragChatController.initializeRAGServices();
  });

  describe('handleChatMessage', () => {
    test('should return 400 for missing message', async () => {
      mockReq.body = {};

      await ragChatController.handleChatMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request'
        })
      );
    });

    test('should return 400 for empty message', async () => {
      mockReq.body = { message: '   ' };

      await ragChatController.handleChatMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request'
        })
      );
    });

    test('should return 400 for non-string message', async () => {
      mockReq.body = { message: 123 };

      await ragChatController.handleChatMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should return 400 for invalid conversation history', async () => {
      mockReq.body = {
        message: 'test',
        conversationHistory: 'not an array'
      };

      await ragChatController.handleChatMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Conversation history must be an array'
        })
      );
    });

    test('should return 400 for malformed conversation history items', async () => {
      mockReq.body = {
        message: 'test',
        conversationHistory: [{ role: 'user' }] // missing content
      };

      await ragChatController.handleChatMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should handle valid message with response', async () => {
      mockReq.body = { message: 'What is NextStep?' };
      
      mockRAGService.generateResponse.mockResolvedValue({
        response: 'NextStep is a job matching platform.',
        sources: [{ document: 'about.md', chunk: 'test', score: 0.9 }]
      });

      await ragChatController.handleChatMessage(mockReq, mockRes);

      expect(mockRAGService.generateResponse).toHaveBeenCalledWith('What is NextStep?', []);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          response: expect.any(String),
          sources: expect.any(Array),
          timestamp: expect.any(String)
        })
      );
    });

    test('should handle conversation history', async () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' }
      ];
      
      mockReq.body = {
        message: 'What is NextStep?',
        conversationHistory: history
      };
      
      mockRAGService.generateResponse.mockResolvedValue({
        response: 'NextStep is a job matching platform.',
        sources: []
      });

      await ragChatController.handleChatMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStatus', () => {
    test('should return status when initialized', async () => {
      await ragChatController.getStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          vectorStore: expect.any(Object),
          ragService: expect.any(Object)
        })
      );
    });
  });

  describe('isInitialized', () => {
    test('should return true when initialized', () => {
      expect(ragChatController.isInitialized()).toBe(true);
    });
  });
});
