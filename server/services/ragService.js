/**
 * RAG Service Core
 * 
 * Implements the core RAG (Retrieval-Augmented Generation) pipeline.
 * Handles document retrieval, context assembly, and response generation.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 4.1, 4.3
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const ragConfig = require('../config/ragConfig');

class RAGService {
  /**
   * Initialize RAG service with vector store and AI model
   * @param {VectorStoreService} vectorStore - Vector store instance
   */
  constructor(vectorStore) {
    this.vectorStore = vectorStore;
    this.genAI = new GoogleGenerativeAI(ragConfig.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: ragConfig.generationModel });
    this.similarityThreshold = ragConfig.similarityThreshold;
    this.maxConversationHistory = ragConfig.maxConversationHistory;
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
    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    try {
      // 🤖 SELF-IMPROVEMENT: Check if this query has negative feedback history
      const retrievalStrategy = await this._getOptimalRetrievalStrategy(query);
      
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

          const result = await this.model.generateContent(smallTalkPrompt);
          const response = result.response.text();

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

      // Format prompt with context
      const prompt = this.formatPrompt(relevantDocs, truncatedHistory, query);

      // Generate response
      console.log('Generating AI response...');
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Format sources
      const sources = this._formatSources(relevantDocs);

      return {
        response: response,
        sources: sources
      };
    } catch (error) {
      console.error('Error generating RAG response:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
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

    // Add system instructions
    prompt += 'You are a helpful AI assistant for NextStep, a job matching platform. ';
    prompt += 'Answer questions based on the provided context from the documentation. ';
    prompt += 'If the context doesn\'t contain enough information, say so. ';
    prompt += 'Be concise and accurate.\n\n';

    // Add context from retrieved documents
    if (documents && documents.length > 0) {
      prompt += '=== CONTEXT FROM DOCUMENTATION ===\n\n';
      documents.forEach((doc, index) => {
        prompt += `[Document ${index + 1}] (Source: ${doc.metadata.source})\n`;
        prompt += `${doc.document}\n\n`;
      });
      prompt += '=== END OF CONTEXT ===\n\n';
    }

    // Add conversation history
    if (history && history.length > 0) {
      prompt += '=== CONVERSATION HISTORY ===\n\n';
      history.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        prompt += `${role}: ${msg.content}\n\n`;
      });
      prompt += '=== END OF HISTORY ===\n\n';
    }

    // Add current query
    prompt += `User Question: ${query}\n\n`;
    prompt += 'Please provide a helpful answer based on the context above:';

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
    try {
      // Try to get MongoDB connection from vector store
      const db = this.vectorStore?.collection?.client?.db;
      
      if (!db) {
        // No database access, use default strategy
        return {
          name: 'default',
          documentCount: ragConfig.retrievalCount,
          expandedQuery: null
        };
      }

      const feedbackCollection = db.collection('rag_feedback');
      
      // Check for similar queries with negative feedback in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
      
      const negativeFeedback = await feedbackCollection.findOne({
        query: { $regex: this._createFuzzyRegex(query), $options: 'i' },
        feedback: 'negative',
        timestamp: { $gte: thirtyDaysAgo }
      });

      if (negativeFeedback) {
        // This query (or similar) has gotten negative feedback
        // Use enhanced retrieval strategy
        console.log('⚠️  Query has negative feedback history - using enhanced retrieval');
        
        return {
          name: 'enhanced',
          documentCount: ragConfig.retrievalCount * 2, // Retrieve more documents
          expandedQuery: this._expandQuery(query), // Expand query terms
          reason: 'negative_feedback_history'
        };
      }

      // Check overall success rate for this type of query
      const totalFeedback = await feedbackCollection.countDocuments({
        query: { $regex: this._createFuzzyRegex(query), $options: 'i' },
        timestamp: { $gte: thirtyDaysAgo }
      });

      if (totalFeedback >= 3) {
        const positiveFeedback = await feedbackCollection.countDocuments({
          query: { $regex: this._createFuzzyRegex(query), $options: 'i' },
          feedback: 'positive',
          timestamp: { $gte: thirtyDaysAgo }
        });

        const successRate = positiveFeedback / totalFeedback;

        if (successRate < 0.6) {
          // Low success rate, use enhanced strategy
          console.log(`⚠️  Query type has low success rate (${(successRate*100).toFixed(0)}%) - using enhanced retrieval`);
          
          return {
            name: 'enhanced',
            documentCount: ragConfig.retrievalCount * 2,
            expandedQuery: this._expandQuery(query),
            reason: 'low_success_rate',
            successRate: successRate
          };
        }
      }

      // Default strategy - everything is working well
      return {
        name: 'default',
        documentCount: ragConfig.retrievalCount,
        expandedQuery: null
      };

    } catch (error) {
      console.error('Error determining retrieval strategy:', error);
      // Fallback to default on error
      return {
        name: 'default',
        documentCount: ragConfig.retrievalCount,
        expandedQuery: null
      };
    }
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
}

module.exports = RAGService;
