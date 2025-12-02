# NextStep RAG Chatbot System Guide

## Overview

The NextStep RAG (Retrieval-Augmented Generation) chatbot provides intelligent, context-aware responses to user questions by retrieving relevant information from your documentation and using Google's Gemini 2.5 Pro AI model to generate accurate answers.

## System Architecture

```
User Question → Vector Search → Retrieve Docs → AI Generation → Response + Sources
                    ↓
              ChromaDB Vector Store
              (65+ document chunks)
```

## Quick Start

### 1. Prerequisites

- Node.js installed
- ChromaDB running on `localhost:8000`
- Google Gemini API key configured in `.env`

### 2. Start ChromaDB

```bash
# Using Docker (recommended)
docker run -p 8000:8000 chromadb/chroma

# Or follow DOCKER_SETUP.md for detailed instructions
```

### 3. Start the Server

```bash
cd server
node server.js
```

Server will run on `http://localhost:4000`

### 4. Ingest Documentation

```bash
# Ingest all docs from ../docs directory
npm run ingest:docs

# Or specify a custom directory
node scripts/ingest-documents.js /path/to/docs
```

## Configuration

All RAG settings are in `server/.env`:

```env
# AI Model Configuration
GEMINI_API_KEY=your_api_key_here
RAG_GENERATION_MODEL=gemini-2.5-pro
RAG_EMBEDDING_MODEL=text-embedding-004

# Document Processing
RAG_CHUNK_SIZE=500              # Characters per chunk (100-2000)
RAG_CHUNK_OVERLAP=50            # Overlap percentage (0-50)

# Retrieval Settings
RAG_RETRIEVAL_COUNT=4           # Number of chunks to retrieve (1-10)
RAG_SIMILARITY_THRESHOLD=0.3    # Minimum similarity score (0-1)

# Vector Store
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
RAG_COLLECTION_NAME=nextstep_docs

# Conversation
RAG_MAX_HISTORY=5               # Max conversation history messages
```

## Usage

### Chat API Endpoint

**POST** `/api/chat`

**Request:**
```json
{
  "message": "What is NextStep?",
  "conversationHistory": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ]
}
```

**Response:**
```json
{
  "response": "NextStep is a swipe-based job matching application...",
  "sources": [
    {
      "document": "README.md",
      "chunk": "NextStep is a job matching platform...",
      "score": 0.55,
      "metadata": {
        "chunkIndex": 0,
        "documentType": "markdown"
      }
    }
  ]
}
```

### Frontend Integration

The ChatWidget component automatically:
- Sends user messages to `/api/chat`
- Displays AI responses with markdown formatting
- Shows source citations with relevance scores
- Maintains conversation history

## Managing Documents

### Add New Documents

1. Add `.md` or `.txt` files to the `docs/` directory
2. Run the ingestion script:
   ```bash
   npm run ingest:docs
   ```

### Clear Vector Store

```bash
npm run clear-vector-store
```

### Check Vector Store Stats

```bash
node -e "
const VectorStoreService = require('./services/vectorStoreService');
(async () => {
  const vs = new VectorStoreService();
  await vs.initialize();
  console.log(await vs.getStats());
})();
"
```

## Testing

### Test RAG Endpoint

```bash
node test-rag-endpoint.js
```

### Test Individual Components

```bash
# Test embedding service
node test-embedding.js

# Test vector store
node test-vector-store.js

# Test document ingestion
node test-document-ingestion.js

# Test full pipeline
node test-ingestion-pipeline.js
```

## Troubleshooting

### ChromaDB Connection Issues

**Error:** `Failed to initialize vector store`

**Solution:**
1. Ensure ChromaDB is running: `docker ps`
2. Check port 8000 is not in use
3. Verify `RAG_CHROMA_HOST` and `RAG_CHROMA_PORT` in `.env`

### No Results Returned

**Error:** "I don't have enough information..."

**Possible causes:**
1. Vector store is empty - run ingestion script
2. Similarity threshold too high - lower `RAG_SIMILARITY_THRESHOLD`
3. Query doesn't match document content

### API Key Issues

**Error:** `GEMINI_API_KEY environment variable is required`

**Solution:**
1. Add `GEMINI_API_KEY` to `server/.env`
2. Get API key from: https://makersuite.google.com/app/apikey
3. Restart the server

### Model Not Found

**Error:** `models/gemini-x.x-xxx is not found`

**Solution:**
1. Check available models by running `node server/test-api-key.js`
2. Update `RAG_GENERATION_MODEL` in `.env` to a valid model
3. Current valid models: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`

## Performance Optimization

### Chunk Size Tuning

- **Smaller chunks (200-300):** More precise retrieval, but may miss context
- **Larger chunks (700-1000):** More context, but less precise matching
- **Default (500):** Good balance for most use cases

### Retrieval Count

- **Fewer chunks (2-3):** Faster, more focused responses
- **More chunks (5-8):** More comprehensive, but may include irrelevant info
- **Default (4):** Optimal for most queries

### Similarity Threshold

- **Higher (0.5-0.7):** Only very relevant documents
- **Lower (0.2-0.4):** More permissive, catches related content
- **Default (0.3):** Good balance

## Monitoring

### Check System Health

```bash
# Server logs
tail -f server/logs/app.log

# Vector store stats
curl http://localhost:4000/api/rag/stats
```

### Common Metrics

- **Response time:** Should be 2-5 seconds
- **Retrieval count:** 4 chunks per query
- **Similarity scores:** 0.4-0.6 is good, >0.6 is excellent
- **Vector store size:** Currently 65 chunks

## Best Practices

### Documentation Guidelines

1. **Use clear headings** - Helps with chunking
2. **Write complete sentences** - Better for semantic search
3. **Include context** - Don't assume prior knowledge
4. **Update regularly** - Re-run ingestion after changes

### Query Optimization

1. **Be specific** - "How do students apply for jobs?" vs "jobs"
2. **Use natural language** - Write like you're asking a person
3. **Provide context** - Reference previous messages in conversation

### Maintenance

1. **Re-ingest monthly** - Keep documentation up to date
2. **Monitor error logs** - Check for API issues
3. **Review source quality** - Ensure relevant docs are retrieved
4. **Update model** - Upgrade to newer Gemini versions when available

## Architecture Details

### Services

- **EmbeddingService** - Converts text to 768-dimensional vectors
- **VectorStoreService** - Manages ChromaDB storage and retrieval
- **DocumentIngestionService** - Processes and chunks documents
- **RAGService** - Orchestrates retrieval and generation
- **RAGChatController** - Handles API requests

### Data Flow

1. User sends message to `/api/chat`
2. Controller validates request
3. RAGService retrieves relevant chunks from vector store
4. RAGService formats prompt with context and history
5. Gemini generates response
6. Response + sources returned to user

## Support

For issues or questions:
1. Check this guide first
2. Review error logs in console
3. Test individual components
4. Check ChromaDB and API key configuration

## Version Info

- **RAG System:** v1.0
- **Gemini Model:** gemini-2.5-pro
- **Embedding Model:** text-embedding-004
- **Vector Store:** ChromaDB 3.1.6
- **Chunks:** 65 documents
- **Last Updated:** December 2024
