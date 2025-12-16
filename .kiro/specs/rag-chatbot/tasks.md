# Implementation Plan

- [x] 1. Set up project dependencies and configuration




  - Install required packages: chromadb, langchain, @langchain/google-genai, fast-check
  - Create RAG configuration file with environment variables
  - Set up ChromaDB storage directory structure
  - _Requirements: 6.1, 6.2, 6.3_




- [x] 2. Implement embedding service
  - Create EmbeddingService class with Google text-embedding-004 integration
  - Implement embedText method for single text embedding
  - Implement embedBatch method for batch processing
  - Add error handling and retry logic
  - _Requirements: 2.2_




- [ ]* 2.1 Write property test for embedding service
  - **Property 5: All chunks have valid embeddings**
  - **Validates: Requirements 2.2**

- [x] 3. Implement vector store service
  - Create VectorStoreService class with ChromaDB integration
  - Implement initialize method to create/load collection
  - Implement addDocuments method for storing chunks with embeddings
  - Implement similaritySearch method for semantic search
  - Implement clear and getStats utility methods
  - _Requirements: 2.3, 2.4, 5.3_

- [x]* 3.1 Write property test for vector store round-trip



  - **Property 6: Storage round-trip preserves data**
  - **Validates: Requirements 2.3, 2.4**

- [ ]* 3.2 Write property test for immediate searchability
  - **Property 10: New documents immediately searchable**
  - **Validates: Requirements 5.3**

- [x] 4. Implement document processing and chunking
  - Create DocumentIngestionService class
  - Implement text splitting with custom recursive splitter
  - Implement markdown file parsing
  - Implement text file parsing
  - Add metadata extraction (source, chunk index, etc.)
  - _Requirements: 2.1, 3.1, 3.2_

- [ ]* 4.1 Write property test for chunk size constraints
  - **Property 4: Chunks respect size constraints**
  - **Validates: Requirements 2.1**

- [ ]* 4.2 Write property test for markdown parsing
  - **Property 7: Markdown parsing extracts text**
  - **Validates: Requirements 3.1**

- [x] 5. Implement document ingestion pipeline
  - Implement ingestDirectory method to process multiple files
  - Implement processDocument method for single file processing
  - Add batch processing for embeddings and storage
  - Add progress reporting and error handling
  - Create ingestion statistics reporting
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.5_

- [ ]* 5.1 Write unit tests for document ingestion
  - Test ingestion of markdown files
  - Test ingestion of text files
  - Test handling of unsupported file formats
  - Test error handling for malformed files
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 6. Implement configuration validation
  - Create configuration validator module



  - Implement validation for chunk size (100-2000)
  - Implement validation for chunk overlap (0-50%)
  - Implement validation for retrieval count (1-10)
  - Add validation error messages
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 6.1 Write property tests for configuration validation
  - **Property 11: Chunk size configuration validation**
  - **Property 12: Chunk overlap configuration validation**
  - **Property 13: Retrieval count configuration validation**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 7. Implement RAG service core
  - Create RAGService class with vector store and AI model dependencies
  - Implement retrieveDocuments method for semantic search
  - Implement formatPrompt method to assemble context
  - Implement conversation history management
  - Add similarity threshold filtering
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_

- [ ]* 7.1 Write property test for document retrieval
  - **Property 1: Document retrieval returns knowledge base chunks**
  - **Validates: Requirements 1.1**

- [x]* 7.2 Write property test for chunk ranking

  - **Property 2: Retrieved chunks are ranked by similarity**
  - **Validates: Requirements 1.2**

- [ ]* 7.3 Write property test for prompt context inclusion
  - **Property 3: Top chunks included in prompt context**
  - **Validates: Requirements 1.3**

- [ ]* 7.4 Write property test for conversation history inclusion
  - **Property 8: Conversation history included in prompt**
  - **Validates: Requirements 4.1**

- [ ]* 7.5 Write property test for conversation history truncation
  - **Property 9: Conversation history truncation**
  - **Validates: Requirements 4.3**

- [ ] 8. Implement response generation with source citations
  - Implement generateResponse method in RAGService
  - Integrate with Google Gemini API for response generation
  - Extract and format source citations from retrieved chunks

  - Implement source reference formatting
  - Add handling for no relevant documents found
  - _Requirements: 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 8.1 Write property test for source references
  - **Property 14: Responses include source references**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ]* 8.2 Write property test for source citation fields
  - **Property 15: Source citations have required fields**
  - **Validates: Requirements 7.3**

- [ ]* 8.3 Write property test for source format consistency
  - **Property 16: Source format consistency**
  - **Validates: Requirements 7.5**

- [ ] 9. Implement error handling and retry logic
  - Add error handling for vector store unavailability
  - Implement retry logic for AI model failures (1 retry)
  - Add error handling for embedding generation failures
  - Implement input validation with error messages
  - Add comprehensive error logging
  - Create user-friendly error response formatting



  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 9.1 Write property test for AI retry logic
  - **Property 17: AI model retry on failure**
  - **Validates: Requirements 8.2**

- [ ]* 9.2 Write property test for invalid input rejection
  - **Property 18: Invalid input rejection**
  - **Validates: Requirements 8.4**

- [ ]* 9.3 Write unit tests for error scenarios
  - Test vector store unavailable error
  - Test embedding generation failure error



  - Test AI model failure with retry
  - Test invalid input validation
  - _Requirements: 8.1, 8.2, 8.3, 8.4_




- [ ] 10. Implement chat controller and API endpoint
  - Create chatController.js with handleChatMessage function
  - Implement request validation
  - Integrate RAGService for response generation
  - Implement conversation history management



  - Add response formatting with sources
  - Create error response handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3_




- [ ]* 10.1 Write integration tests for chat endpoint
  - Test end-to-end chat flow with valid query
  - Test chat with conversation history
  - Test chat with no relevant documents
  - Test error handling for invalid requests
  - _Requirements: 1.1, 1.4, 4.1_

- [ ] 11. Create chat routes and integrate with Express server
  - Create chatRoutes.js with POST /api/chat endpoint
  - Add route to Express server
  - Add request validation middleware
  - Add error handling middleware
  - _Requirements: 1.1, 1.4_

- [x] 12. Create document ingestion script
  - Create standalone script for ingesting documents
  - Add command-line argument parsing for directory path
  - Implement progress reporting during ingestion
  - Add summary statistics output
  - Create documentation for running the script
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 13. Ingest initial knowledge base documents
  - Run ingestion script on docs/ directory
  - Verify documents are stored in vector store
  - Test search functionality with sample queries
  - Document the ingestion process
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Update frontend to display source citations
  - Modify ChatWidget to display source references
  - Add UI component for source citations
  - Style source citations for readability
  - Test source display with various response formats
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ]* 15.1 Write unit tests for source citation UI
  - Test rendering of source citations
  - Test handling of responses without sources
  - Test handling of multiple sources
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
