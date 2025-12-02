/**
 * Vector Store Service
 * 
 * Manages vector database operations using ChromaDB for storing and retrieving
 * document embeddings for semantic search in the RAG system.
 * 
 * Validates: Requirements 2.3, 2.4, 5.3
 */

const { ChromaClient } = require('chromadb');
const ragConfig = require('../config/ragConfig');
const EmbeddingService = require('./embeddingService');

class VectorStoreService {
  /**
   * Initialize vector store connection
   * @param {string} collectionName - Name of the collection (optional, uses config default)
   */
  constructor(collectionName = null) {
    this.collectionName = collectionName || ragConfig.collectionName;
    this.client = null;
    this.collection = null;
    this.embeddingService = new EmbeddingService();
    this.isInitialized = false;
  }

  /**
   * Initialize the vector store (create collection if needed)
   * 
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   * 
   * Validates: Requirements 2.3
   */
  async initialize() {
    try {
      // Initialize ChromaDB client
      // ChromaDB JS client connects to a ChromaDB server
      const chromaUrl = `http://${ragConfig.chromaHost}:${ragConfig.chromaPort}`;
      this.client = new ChromaClient({ path: chromaUrl });

      // Get or create collection
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: {
            description: 'NextStep documentation embeddings for RAG chatbot',
            embeddingModel: ragConfig.embeddingModel,
            createdAt: new Date().toISOString()
          }
        });
        
        this.isInitialized = true;
        console.log(`Vector store initialized: collection "${this.collectionName}"`);
      } catch (error) {
        console.error('Error creating/getting collection:', error);
        throw new Error(`Failed to initialize collection: ${error.message}`);
      }
    } catch (error) {
      console.error('Error initializing ChromaDB client:', error);
      throw new Error(`Failed to initialize vector store: ${error.message}`);
    }
  }

  /**
   * Ensure the vector store is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }
  }

  /**
   * Add documents to the vector store
   * 
   * @param {Array<Object>} documents - Array of {text, metadata} objects
   * @returns {Promise<void>}
   * @throws {Error} If documents are invalid or storage fails
   * 
   * Validates: Requirements 2.3, 2.4, 5.3
   */
  async addDocuments(documents) {
    this._ensureInitialized();

    // Validate input
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('Documents must be a non-empty array');
    }

    // Validate document structure
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc.text || typeof doc.text !== 'string') {
        throw new Error(`Document at index ${i} must have a 'text' property of type string`);
      }
      if (!doc.metadata || typeof doc.metadata !== 'object') {
        throw new Error(`Document at index ${i} must have a 'metadata' property of type object`);
      }
    }

    try {
      // Extract texts for embedding
      const texts = documents.map(doc => doc.text);
      
      // Generate embeddings
      console.log(`Generating embeddings for ${texts.length} documents...`);
      const embeddings = await this.embeddingService.embedBatch(texts);

      // Prepare data for ChromaDB
      const ids = documents.map((doc, i) => 
        doc.metadata.id || `doc_${Date.now()}_${i}`
      );
      const metadatas = documents.map(doc => ({
        ...doc.metadata,
        addedAt: new Date().toISOString()
      }));

      // Add to collection
      await this.collection.add({
        ids: ids,
        embeddings: embeddings,
        documents: texts,
        metadatas: metadatas
      });

      console.log(`Successfully added ${documents.length} documents to vector store`);
    } catch (error) {
      console.error('Error adding documents to vector store:', error);
      throw new Error(`Failed to add documents: ${error.message}`);
    }
  }

  /**
   * Search for similar documents using semantic search
   * 
   * @param {string} query - Search query text
   * @param {number} topK - Number of results to return (default: from config)
   * @returns {Promise<Array>} Array of {id, document, metadata, distance} objects
   * @throws {Error} If query is invalid or search fails
   * 
   * Validates: Requirements 1.1, 1.2, 5.3
   */
  async similaritySearch(query, topK = null) {
    this._ensureInitialized();

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    const k = topK || ragConfig.retrievalCount;
    if (k < 1 || k > 100) {
      throw new Error('topK must be between 1 and 100');
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.embedText(query);

      // Search collection
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: k
      });

      // Format results
      if (!results.ids || !results.ids[0] || results.ids[0].length === 0) {
        return [];
      }

      const formattedResults = [];
      for (let i = 0; i < results.ids[0].length; i++) {
        formattedResults.push({
          id: results.ids[0][i],
          document: results.documents[0][i],
          metadata: results.metadatas[0][i],
          distance: results.distances[0][i],
          score: 1 - results.distances[0][i] // Convert distance to similarity score
        });
      }

      return formattedResults;
    } catch (error) {
      console.error('Error performing similarity search:', error);
      throw new Error(`Failed to search: ${error.message}`);
    }
  }

  /**
   * Delete all documents from the collection
   * 
   * @returns {Promise<void>}
   * @throws {Error} If clear operation fails
   */
  async clear() {
    this._ensureInitialized();

    try {
      // Delete the collection and recreate it
      await this.client.deleteCollection({ name: this.collectionName });
      
      // Recreate the collection
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: {
          description: 'NextStep documentation embeddings for RAG chatbot',
          embeddingModel: ragConfig.embeddingModel,
          createdAt: new Date().toISOString()
        }
      });

      console.log(`Vector store cleared: collection "${this.collectionName}"`);
    } catch (error) {
      console.error('Error clearing vector store:', error);
      throw new Error(`Failed to clear vector store: ${error.message}`);
    }
  }

  /**
   * Get collection statistics
   * 
   * @returns {Promise<Object>} Statistics object with count and metadata
   * @throws {Error} If stats retrieval fails
   */
  async getStats() {
    this._ensureInitialized();

    try {
      const count = await this.collection.count();
      
      return {
        count: count,
        collectionName: this.collectionName,
        embeddingModel: ragConfig.embeddingModel,
        embeddingDimension: this.embeddingService.getEmbeddingDimension()
      };
    } catch (error) {
      console.error('Error getting vector store stats:', error);
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  /**
   * Check if the vector store is initialized
   * 
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized && this.collection !== null;
  }

  /**
   * Get the collection name
   * 
   * @returns {string} Collection name
   */
  getCollectionName() {
    return this.collectionName;
  }
}

module.exports = VectorStoreService;
