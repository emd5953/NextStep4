# RAG Chatbot Design Document

## Overview

The RAG (Retrieval-Augmented Generation) Chatbot system enhances the existing NextStep chat interface with intelligent document retrieval capabilities. The system will ingest documentation, create vector embeddings, store them in a vector database, and use semantic search to retrieve relevant context when answering user questions. This design leverages the existing chat UI and backend infrastructure while adding RAG-specific components.

The system architecture follows a modular approach with clear separation between document ingestion, vector storage, retrieval, and response generation. We'll use LangChain for orchestration, a vector database for efficient similarity search, and integrate with the existing Google Gemini AI model for response generation.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Chat Widget   │ (Existing)
│   (Frontend)    │
└────────┬────────┘
         │ HTTP POST /api/chat
         ▼
┌─────────────────────────────────────────┐
│         Express Server                   │
│  ┌───────────────────────────────────┐  │
│  │     Chat Controller               │  │
│  │  - Receives user message          │  │
│  │  - Manages conversation history   │  │
│  └──────────┬────────────────────────┘  │
│             ▼                            │
│  ┌───────────────────────────────────┐  │
│  │     RAG Service                   │  │
│  │  - Query embedding                │  │
│  │  - Vector search                  │  │
│  │  - Context assembly               │  │
│  │  - Response generation            │  │
│  └──────┬────────────────────┬───────┘  │
│         │                    │           │
│         ▼                    ▼           │
│  ┌──────────────┐    ┌──────────────┐  │
│  │Vector Store  │    │  AI Model    │  │
│  │  (Chroma)    │    │  (Gemini)    │  │
│  └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     Document Ingestion Pipeline         │
│  (Separate script/endpoint)             │
│                                          │
│  Documents → Chunking → Embedding →     │
│  Vector Store                            │
└─────────────────────────────────────────┘
```

### Component Interaction Flow

1. **User Query Flow**:
   - User sends message via ChatWidget
   - Backend receives message at `/api/chat`
   - RAG Service generates embedding for query
   - Vector Store performs similarity search
   - Top-k relevant chunks retrieved
   - Chunks + conversation history assembled as context
   - AI Model generates response with context
   - Response returned to user

2. **Document Ingestion Flow**:
   - Admin runs ingestion script with document directory
   - Documents loaded and parsed
   - Text split into chunks with overlap
   - Embeddings generated for each chunk
   - Chunks and embeddings stored in Vector Store
   - Metadata (source, position) preserved

## Components and Interfaces

### 1. Chat Controller (`server/controllers/chatController.js`)

Handles incoming chat requests and orchestrates the RAG pipeline.

**Interface**:
```javascript
/**
 * Handle chat message and return AI response
 * @param {Object} req - Express request object
 * @param {string} req.body.message - User's message
 * @param {Array} req.body.conversationHistory - Optional conversation history
 * @returns {Object} { response: string, sources: Array }
 */
async function handleChatMessage(req, res)
```

**Responsibilities**:
- Validate incoming requests
- Manage conversation history (last 5 messages)
- Call RAG Service for response generation
- Format and return response with sources
- Handle errors gracefully

### 2. RAG Service (`server/services/ragService.js`)

Core service that implements the RAG pipeline.

**Interface**:
```javascript
class RAGService {
  /**
   * Initialize RAG service with vector store and AI model
   */
  constructor(vectorStore, aiModel)
  
  /**
   * Generate response using RAG pipeline
   * @param {string} query - User's question
   * @param {Array} conversationHistory - Previous messages
   * @returns {Object} { response: string, sources: Array }
   */
  async generateResponse(query, conversationHistory = [])
  
  /**
   * Retrieve relevant documents for a query
   * @param {string} query - User's question
   * @param {number} topK - Number of documents to retrieve
   * @returns {Array} Retrieved document chunks with scores
   */
  async retrieveDocuments(query, topK = 4)
  
  /**
   * Format retrieved documents and history into prompt context
   * @param {Array} documents - Retrieved chunks
   * @param {Array} history - Conversation history
   * @param {string} query - Current question
   * @returns {string} Formatted prompt
   */
  formatPrompt(documents, history, query)
}
```

**Responsibilities**:
- Embed user queries
- Perform semantic search in vector store
- Assemble context from retrieved documents
- Generate prompts with context
- Call AI model for response generation
- Extract and format source citations

### 3. Vector Store Service (`server/services/vectorStoreService.js`)

Manages vector database operations.

**Interface**:
```javascript
class VectorStoreService {
  /**
   * Initialize vector store connection
   * @param {string} collectionName - Name of the collection
   */
  constructor(collectionName)
  
  /**
   * Initialize the vector store (create collection if needed)
   */
  async initialize()
  
  /**
   * Add documents to the vector store
   * @param {Array} documents - Array of {text, metadata}
   */
  async addDocuments(documents)
  
  /**
   * Search for similar documents
   * @param {string} query - Search query
   * @param {number} topK - Number of results
   * @returns {Array} Similar documents with scores
   */
  async similaritySearch(query, topK = 4)
  
  /**
   * Delete all documents from the collection
   */
  async clear()
  
  /**
   * Get collection statistics
   * @returns {Object} { count: number, ... }
   */
  async getStats()
}
```

**Responsibilities**:
- Manage ChromaDB connection
- Store and index document embeddings
- Perform efficient similarity search
- Handle vector store errors
- Provide collection management utilities

### 4. Document Ingestion Service (`server/services/documentIngestionService.js`)

Processes documents and loads them into the vector store.

**Interface**:
```javascript
class DocumentIngestionService {
  /**
   * Initialize ingestion service
   * @param {VectorStoreService} vectorStore
   */
  constructor(vectorStore)
  
  /**
   * Ingest documents from a directory
   * @param {string} directoryPath - Path to documents
   * @param {Object} options - Chunking options
   * @returns {Object} { processed: number, failed: number }
   */
  async ingestDirectory(directoryPath, options = {})
  
  /**
   * Process a single document
   * @param {string} filePath - Path to document
   * @param {Object} options - Processing options
   * @returns {Array} Processed chunks
   */
  async processDocument(filePath, options = {})
  
  /**
   * Split text into chunks
   * @param {string} text - Text to split
   * @param {Object} options - { chunkSize, chunkOverlap }
   * @returns {Array} Text chunks
   */
  splitText(text, options = {})
}
```

**Responsibilities**:
- Load documents from filesystem
- Parse different file formats (markdown, txt)
- Split documents into chunks
- Generate metadata for chunks
- Batch process and store in vector store
- Report ingestion statistics

### 5. Embedding Service (`server/services/embeddingService.js`)

Generates embeddings for text using Google's embedding model.

**Interface**:
```javascript
class EmbeddingService {
  /**
   * Initialize embedding service
   */
  constructor()
  
  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Array} Embedding vector
   */
  async embedText(text)
  
  /**
   * Generate embeddings for multiple texts
   * @param {Array} texts - Array of texts
   * @returns {Array} Array of embedding vectors
   */
  async embedBatch(texts)
}
```

**Responsibilities**:
- Interface with Google Gemini embedding API
- Handle batch embedding requests
- Manage API rate limits
- Cache embeddings if needed

## Data Models

### Document Chunk

```javascript
{
  id: string,              // Unique identifier
  text: string,            // Chunk content
  embedding: number[],     // Vector embedding (768 dimensions)
  metadata: {
    source: string,        // Source document path/name
    chunkIndex: number,    // Position in original document
    totalChunks: number,   // Total chunks from source
    documentType: string,  // File type (md, txt, etc.)
    createdAt: Date        // Ingestion timestamp
  }
}
```

### Chat Message

```javascript
{
  role: string,           // 'user' or 'assistant'
  content: string,        // Message text
  timestamp: Date         // Message timestamp
}
```

### RAG Response

```javascript
{
  response: string,       // Generated answer
  sources: [              // Source documents used
    {
      document: string,   // Document name
      chunk: string,      // Relevant text excerpt
      score: number       // Similarity score
    }
  ]
}
```

### Configuration

```javascript
{
  chunkSize: number,           // Default: 500 characters
  chunkOverlap: number,        // Default: 50 characters
  retrievalCount: number,      // Default: 4 chunks
  embeddingModel: string,      // Default: 'text-embedding-004'
  generationModel: string,     // Default: 'gemini-1.5-flash'
  maxConversationHistory: number, // Default: 5 messages
  vectorStorePath: string      // Path to ChromaDB storage
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:
- Properties 2.3 and 2.4 both test metadata preservation and can be combined into a single round-trip property
- Property 3.2 is covered by property 2.1 (chunking behavior)
- Properties 7.2 and 7.3 can be combined into a comprehensive source citation property

### Core Properties

**Property 1: Document retrieval returns knowledge base chunks**
*For any* valid user question, the retrieval function should return document chunks that exist in the knowledge base.
**Validates: Requirements 1.1**

**Property 2: Retrieved chunks are ranked by similarity**
*For any* query and set of retrieved chunks, the chunks should be ordered by descending similarity scores.
**Validates: Requirements 1.2**

**Property 3: Top chunks included in prompt context**
*For any* query and retrieved chunks, the formatted prompt should contain the text content from the top-k retrieved chunks.
**Validates: Requirements 1.3**

**Property 4: Chunks respect size constraints**
*For any* document processed for ingestion, all generated chunks should have character length between the minimum (100) and maximum (chunkSize) configured values.
**Validates: Requirements 2.1**

**Property 5: All chunks have valid embeddings**
*For any* set of text chunks processed, each chunk should have an embedding vector of the expected dimension (768 for text-embedding-004).
**Validates: Requirements 2.2**

**Property 6: Storage round-trip preserves data**
*For any* chunk with text, embedding, and metadata, storing it in the vector store and then retrieving it should return equivalent data.
**Validates: Requirements 2.3, 2.4**

**Property 7: Markdown parsing extracts text**
*For any* valid markdown document, the parser should extract text content and the result should contain the original text without markdown syntax.
**Validates: Requirements 3.1**

**Property 8: Conversation history included in prompt**
*For any* conversation history and new question, the formatted prompt should include the content from all messages in the history.
**Validates: Requirements 4.1**

**Property 9: Conversation history truncation**
*For any* conversation history exceeding the maximum length, only the most recent N messages (where N is maxConversationHistory) should be retained.
**Validates: Requirements 4.3**

**Property 10: New documents immediately searchable**
*For any* document added to the vector store, immediately performing a search with text from that document should return the document in the results.
**Validates: Requirements 5.3**

**Property 11: Chunk size configuration validation**
*For any* chunk size value, the system should accept values between 100 and 2000 (inclusive) and reject values outside this range with an error.
**Validates: Requirements 6.1**

**Property 12: Chunk overlap configuration validation**
*For any* chunk overlap percentage, the system should accept values between 0 and 50 (inclusive) and reject values outside this range with an error.
**Validates: Requirements 6.2**

**Property 13: Retrieval count configuration validation**
*For any* retrieval count value, the system should accept values between 1 and 10 (inclusive) and reject values outside this range with an error.
**Validates: Requirements 6.3**

**Property 14: Responses include source references**
*For any* response generated using retrieved chunks, the response object should include source references for all chunks used.
**Validates: Requirements 7.1, 7.2, 7.3**

**Property 15: Source citations have required fields**
*For any* source citation in a response, it should contain document name, text excerpt, and similarity score fields.
**Validates: Requirements 7.3**

**Property 16: Source format consistency**
*For any* set of source citations in a response, all citations should follow the same format structure.
**Validates: Requirements 7.5**

**Property 17: AI model retry on failure**
*For any* AI model failure during response generation, the system should attempt exactly one retry before returning an error.
**Validates: Requirements 8.2**

**Property 18: Invalid input rejection**
*For any* invalid input (empty string, null, undefined), the system should reject it and return an error message.
**Validates: Requirements 8.4**

## Error Handling

### Error Categories

1. **Validation Errors**
   - Invalid configuration values
   - Empty or malformed queries
   - Unsupported file formats
   - Response: 400 Bad Request with descriptive message

2. **Service Unavailable Errors**
   - Vector store connection failure
   - AI model API unavailable
   - Response: 503 Service Unavailable with retry guidance

3. **Processing Errors**
   - Document parsing failures
   - Embedding generation failures
   - Response: 500 Internal Server Error with user-friendly message

4. **Not Found Errors**
   - No relevant documents found (similarity below threshold)
   - Response: 200 OK with message indicating no results

### Error Handling Strategy

- All errors logged with full stack traces and context
- User-facing errors simplified and actionable
- Retry logic for transient failures (AI API, network)
- Graceful degradation when vector store unavailable
- Circuit breaker pattern for external API calls

### Error Response Format

```javascript
{
  error: true,
  message: string,        // User-friendly message
  code: string,          // Error code for client handling
  details?: string       // Additional context (dev mode only)
}
```

## Testing Strategy

### Unit Testing

The system will use Jest for unit testing with the following focus areas:

**Core Logic Tests**:
- Text chunking algorithm with various input sizes
- Prompt formatting with different context combinations
- Configuration validation for all parameters
- Metadata extraction and preservation
- Error handling for each error category

**Integration Points**:
- Vector store operations (add, search, clear)
- AI model API calls with mocked responses
- Document parsing for different file types
- Conversation history management

**Edge Cases**:
- Empty documents
- Documents with only whitespace
- Very long documents (>100k characters)
- Special characters and Unicode
- Code blocks in markdown
- Conversation history at exactly the limit
- No relevant documents found scenario

### Property-Based Testing

The system will use fast-check for property-based testing to verify universal properties across many randomly generated inputs.

**Configuration**:
- Library: fast-check (JavaScript property testing)
- Minimum iterations: 100 runs per property
- Each test tagged with: `**Feature: rag-chatbot, Property {number}: {property_text}**`

**Property Test Coverage**:

Each correctness property listed above will be implemented as a property-based test:

1. **Property 1-3**: Test retrieval and ranking with generated queries
2. **Property 4-6**: Test chunking and storage with generated documents
3. **Property 7**: Test markdown parsing with generated markdown
4. **Property 8-9**: Test conversation history with generated message sequences
5. **Property 10**: Test immediate searchability with generated documents
6. **Property 11-13**: Test configuration validation with generated values
7. **Property 14-16**: Test source citation with generated responses
8. **Property 17-18**: Test error handling with generated invalid inputs

**Generators**:
- Random text documents (varying lengths, special characters)
- Random markdown documents (headings, lists, code blocks)
- Random conversation histories (varying lengths)
- Random configuration values (valid and invalid ranges)
- Random queries (short, long, with special characters)

### Integration Testing

- End-to-end chat flow from user query to response
- Document ingestion pipeline from files to vector store
- Vector store persistence across restarts
- Concurrent query handling
- Error recovery scenarios

### Testing Approach

1. **Implementation First**: Implement core functionality before writing tests
2. **Property Tests for Correctness**: Use property-based tests to verify universal behaviors
3. **Unit Tests for Examples**: Use unit tests for specific examples and edge cases
4. **Integration Tests for Workflows**: Test complete user workflows end-to-end

## Implementation Notes

### Technology Stack

- **Vector Database**: ChromaDB (embedded, no separate server needed)
- **Embedding Model**: Google text-embedding-004 (768 dimensions)
- **LLM**: Google Gemini 1.5 Flash (existing)
- **Orchestration**: LangChain.js for RAG pipeline
- **Text Splitting**: LangChain RecursiveCharacterTextSplitter
- **Testing**: Jest (unit), fast-check (property-based)

### Configuration Management

Configuration stored in environment variables and config file:

```javascript
// server/config/ragConfig.js
module.exports = {
  chunkSize: parseInt(process.env.RAG_CHUNK_SIZE) || 500,
  chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP) || 50,
  retrievalCount: parseInt(process.env.RAG_RETRIEVAL_COUNT) || 4,
  embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-004',
  generationModel: process.env.RAG_GENERATION_MODEL || 'gemini-1.5-flash',
  maxConversationHistory: parseInt(process.env.RAG_MAX_HISTORY) || 5,
  vectorStorePath: process.env.RAG_VECTOR_STORE_PATH || './data/chroma',
  similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD) || 0.5
};
```

### Document Sources

Initial knowledge base will include:
- `docs/requirements.md` - Application requirements
- `README.md` - Project overview
- Any additional markdown files in `docs/` directory

### Deployment Considerations

- ChromaDB data persisted to disk (not in-memory)
- Vector store path configurable for different environments
- Ingestion script can be run manually or scheduled
- Consider separate ingestion service for production
- Monitor embedding API usage and costs

### Performance Targets

- Query response time: < 3 seconds (p95)
- Document ingestion: ~100 chunks/second
- Vector search: < 500ms for 10k chunks
- Concurrent queries: Support 10+ simultaneous users

### Security Considerations

- Validate all user inputs
- Sanitize document content before storage
- Rate limit chat API endpoint
- Secure API keys in environment variables
- No sensitive data in knowledge base
- Audit logging for all operations
