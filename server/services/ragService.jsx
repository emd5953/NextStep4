/**
 * RAG Service Core
 * 
 * Implements the core RAG (Retrieval-Augmented Generation) pipeline.
 * Handles document retrieval, context assembly, and response generation.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 4.1, 4.3
 */

const { generateText } = require('./geminiService.js');
const ragConfig = require('../config/ragConfig.jsx');

class RAGService {
  /**
   * Initialize RAG service with vector store and AI model
   * @param {VectorStoreService} vectorStore - Vector store instance
   */
  constructor(vectorStore) {
    this.vectorStore = vectorStore;
    this.model = ragConfig.generationModel;
    this.similarityThreshold = ragConfig.similarityThreshold;
    this.maxConversationHistory = ragConfig.maxConversationHistory;
    
    // Simple in-memory cache for common queries (LRU cache)
    this.responseCache = new Map();
    this.maxCacheSize = 50;
    
    // 🚀 OPTIMIZATION: Track API usage
    this.apiCallCount = 0;
    this.cacheHitCount = 0;
  }

  /**
   * Generate response using RAG pipeline
   * 
   * @param {string} query - User's question
   * @param {Array} conversationHistory - Previous messages [{role, content}]
   * @param {Object} userContext - Optional user context (isEmployer, etc.)
   * @returns {Promise<Object>} { response: string, sources: Array }
   * @throws {Error} If query is invalid or generation fails
   * 
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.1, 4.3
   */
  async generateResponse(query, conversationHistory = [], userContext = null) {
    const startTime = Date.now();
    
    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    try {
      // Check cache first (only for queries without history)
      if (conversationHistory.length === 0) {
        const cacheKey = this._getCacheKey(query);
        const cached = this.responseCache.get(cacheKey);
        if (cached) {
          this.cacheHitCount++;
          console.log(`Cache hit! Returning cached response (${Date.now() - startTime}ms)`);
          return cached;
        }
      }

      // 🚀 OPTIMIZATION: Run retrieval strategy check and document retrieval in parallel
      const [retrievalStrategy] = await Promise.all([
        this._getOptimalRetrievalStrategy(query)
      ]);
      
      // Retrieve relevant documents with adaptive strategy
      console.log(`Retrieving documents (strategy: ${retrievalStrategy.name})...`);
      const documents = await this.retrieveDocuments(
        retrievalStrategy.expandedQuery || query, 
        retrievalStrategy.documentCount
      );

      // Filter by similarity threshold
      const relevantDocs = documents.filter(doc => doc.score >= this.similarityThreshold);

      // Smart fallback: If no relevant docs AND query is short/casual, treat as small talk
      if (relevantDocs.length === 0) {
        const queryLength = query.trim().split(/\s+/).length;
        const isShortQuery = queryLength <= 3;
        const topScore = documents.length > 0 ? documents[0].score : 0;
        const isLowRelevance = topScore < 0.35;

        // If it's a short query with low relevance, likely small talk
        if (isShortQuery && isLowRelevance) {
          // Use AI to generate a friendly response
          const smallTalkPrompt = `You are a friendly NextStep assistant. The user said: "${query}". 
This seems like casual conversation, not a question about NextStep. 
Respond naturally and friendly, then guide them to ask about NextStep features. Keep it brief (1-2 sentences).`;

          this.apiCallCount++;
          const response = await generateText(smallTalkPrompt, { model: this.model });

          return {
            response: response,
            sources: []
          };
        }

        // Otherwise, it's a real question we can't answer
        return {
          response: "I don't have enough information in my knowledge base to answer that specific question. I'm designed to help with questions about NextStep's features, job matching, application tracking, and platform functionality. Could you rephrase your question or ask about something else related to NextStep?",
          sources: []
        };
      }

      // Truncate conversation history if needed
      const truncatedHistory = this._truncateHistory(conversationHistory);

      // Format prompt with context (optimized - shorter prompt)
      const prompt = this.formatPrompt(relevantDocs, truncatedHistory, query);

      // Generate response with timeout
      console.log('Generating AI response...');
      this.apiCallCount++;
      
      const response = await generateText(prompt, { model: this.model, temperature: 0.7 });
      console.log(`✅ Gemini API call #${this.apiCallCount} completed`);

      // Format sources
      const sources = this._formatSources(relevantDocs);

      const finalResult = {
        response: response,
        sources: sources
      };

      // Cache the result (only for queries without history)
      if (conversationHistory.length === 0) {
        this._cacheResponse(query, finalResult);
      }

      console.log(`Total response time: ${Date.now() - startTime}ms`);
      return finalResult;
      
    } catch (error) {
      console.error('Error generating RAG response:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant documents for a query
   * 
   * @param {string} query - User's question
   * @param {number} topK - Number of documents to retrieve
   * @returns {Promise<Array>} Retrieved document chunks with scores
   * @throws {Error} If retrieval fails
   * 
   * Validates: Requirements 1.1, 1.2
   */
  async retrieveDocuments(query, topK = 4) {
    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    if (topK < 1 || topK > 10) {
      throw new Error('topK must be between 1 and 10');
    }

    try {
      // Perform similarity search
      const results = await this.vectorStore.similaritySearch(query, topK);

      // Results are already ranked by similarity (highest first)
      // Validate ranking
      for (let i = 0; i < results.length - 1; i++) {
        if (results[i].score < results[i + 1].score) {
          console.warn('Warning: Documents not properly ranked by similarity');
        }
      }

      return results;
    } catch (error) {
      console.error('Error retrieving documents:', error);
      if (error.status) throw error;
      throw new Error(`Failed to retrieve documents: ${error.message}`);
    }
  }

  /**
   * Format retrieved documents and history into prompt context
   * 
   * @param {Array} documents - Retrieved chunks
   * @param {Array} history - Conversation history
   * @param {string} query - Current question
   * @returns {string} Formatted prompt
   * 
   * Validates: Requirements 1.3, 4.1
   */
  formatPrompt(documents, history, query) {
    let prompt = '';

    // 🚀 OPTIMIZATION: Shorter, more concise system instructions
    prompt += 'You are NextStep assistant. Answer based on context. Be brief and helpful.\n\n';

    // Add context from retrieved documents (optimized - no extra formatting)
    if (documents && documents.length > 0) {
      prompt += 'CONTEXT:\n';
      documents.forEach((doc, index) => {
        prompt += `${index + 1}. [${doc.metadata?.source || "Help"}] ${doc.document}\n\n`;
      });
    }

    // Add conversation history (only if present)
    if (history && history.length > 0) {
      prompt += 'CONVERSATION HISTORY:\n';
      history.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    // Add current query
    prompt += `User Question: ${query}\n\nAnswer:`;

    return prompt;
  }

  /**
   * Truncate conversation history to maximum length
   * 
   * @param {Array} history - Conversation history
   * @returns {Array} Truncated history
   * @private
   * 
   * Validates: Requirements 4.3
   */
  _truncateHistory(history) {
    if (!history || !Array.isArray(history)) {
      return [];
    }

    // Keep only the most recent messages
    if (history.length > this.maxConversationHistory) {
      return history.slice(-this.maxConversationHistory);
    }

    return history;
  }

  /**
   * Format source citations from retrieved documents
   * 
   * @param {Array} documents - Retrieved documents
   * @returns {Array} Formatted source citations
   * @private
   * 
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  _formatSources(documents) {
    if (!documents || documents.length === 0) {
      return [];
    }

    return documents.map(doc => ({
      document: doc.metadata.source || 'Unknown',
      chunk: doc.document.substring(0, 200) + (doc.document.length > 200 ? '...' : ''),
      score: Math.round(doc.score * 100) / 100,
      metadata: {
        chunkIndex: doc.metadata.chunkIndex,
        documentType: doc.metadata.documentType
      }
    }));
  }

  /**
   * Get the similarity threshold
   * 
   * @returns {number} Similarity threshold
   */
  getSimilarityThreshold() {
    return this.similarityThreshold;
  }

  /**
   * Get the maximum conversation history length
   * 
   * @returns {number} Maximum conversation history
   */
  getMaxConversationHistory() {
    return this.maxConversationHistory;
  }

  /**
   * 🤖 SELF-IMPROVEMENT: Determine optimal retrieval strategy based on feedback history
   * 
   * @param {string} query - User's question
   * @returns {Promise<Object>} Retrieval strategy configuration
   * @private
   */
  async _getOptimalRetrievalStrategy(query) {
    // Retrieval uses public help documentation; private feedback is never sent to the model.
    return { name: 'default', documentCount: ragConfig.retrievalCount, expandedQuery: null };
  }

  /**
   * Create fuzzy regex for similar query matching
   * @param {string} query - Original query
   * @returns {string} Regex pattern
   * @private
   */
  _createFuzzyRegex(query) {
    // Extract key words (remove common words)
    const stopWords = ['how', 'do', 'i', 'can', 'what', 'is', 'the', 'a', 'an', 'to', 'for'];
    const words = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    if (words.length === 0) {
      return query;
    }

    // Create regex that matches if any key words are present
    return words.join('|');
  }

  /**
   * Expand query with synonyms and related terms
   * @param {string} query - Original query
   * @returns {string} Expanded query
   * @private
   */
  _expandQuery(query) {
    const expansions = {
      'apply': 'apply application submit',
      'job': 'job position role opening',
      'profile': 'profile account settings information',
      'search': 'search find browse discover look',
      'message': 'message chat communicate contact',
      'withdraw': 'withdraw cancel remove delete',
      'swipe': 'swipe right left apply pass',
      'employer': 'employer company recruiter hiring',
      'resume': 'resume cv curriculum vitae',
      'interview': 'interview meeting screening call',
      'salary': 'salary pay compensation wage',
      'remote': 'remote work from home distributed'
    };

    let expandedQuery = query.toLowerCase();
    
    for (const [key, expansion] of Object.entries(expansions)) {
      if (expandedQuery.includes(key)) {
        expandedQuery += ' ' + expansion;
      }
    }

    console.log(`Query expanded: "${query}" → "${expandedQuery}"`);
    return expandedQuery;
  }

  /**
   * 🚀 OPTIMIZATION: Generate cache key for query
   * @param {string} query - User query
   * @returns {string} Cache key
   * @private
   */
  _getCacheKey(query) {
    return query.toLowerCase().trim();
  }

  /**
   * 🚀 OPTIMIZATION: Cache response with LRU eviction
   * @param {string} query - User query
   * @param {Object} response - Response to cache
   * @private
   */
  _cacheResponse(query, response) {
    const cacheKey = this._getCacheKey(query);
    
    // If cache is full, remove oldest entry (first item)
    if (this.responseCache.size >= this.maxCacheSize) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
    
    this.responseCache.set(cacheKey, response);
  }

  /**
   * Clear response cache (useful for testing or after documentation updates)
   */
  clearCache() {
    this.responseCache.clear();
    console.log('Response cache cleared');
  }

  /**
   * Get API usage statistics
   */
  getApiStats() {
    return {
      geminiApiCalls: this.apiCallCount,
      cacheHits: this.cacheHitCount,
      cacheSize: this.responseCache.size,
      hitRate: this.apiCallCount + this.cacheHitCount > 0 
        ? ((this.cacheHitCount / (this.apiCallCount + this.cacheHitCount)) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

module.exports = RAGService;
