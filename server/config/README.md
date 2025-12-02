# RAG Configuration

This directory contains the configuration for the RAG (Retrieval-Augmented Generation) chatbot system.

## Files

- `ragConfig.js` - Main configuration module with validation
- `ragConfig.test.js` - Unit tests for configuration validation

## Configuration Parameters

All parameters can be configured via environment variables in `server/.env`:

### Document Chunking (Requirement 6.1, 6.2)
- `RAG_CHUNK_SIZE` - Size of document chunks (100-2000 characters, default: 500)
- `RAG_CHUNK_OVERLAP` - Overlap between chunks (0-50%, default: 50)

### Retrieval Settings (Requirement 6.3)
- `RAG_RETRIEVAL_COUNT` - Number of chunks to retrieve (1-10, default: 4)
- `RAG_SIMILARITY_THRESHOLD` - Minimum similarity score (default: 0.5)

### Model Configuration
- `RAG_EMBEDDING_MODEL` - Embedding model name (default: 'text-embedding-004')
- `RAG_GENERATION_MODEL` - Generation model name (default: 'gemini-1.5-flash')

### System Configuration
- `RAG_MAX_HISTORY` - Maximum conversation history messages (default: 5)
- `RAG_VECTOR_STORE_PATH` - Path to ChromaDB storage (default: './data/chroma')
- `RAG_COLLECTION_NAME` - ChromaDB collection name (default: 'nextstep_docs')
- `GEMINI_API_KEY` - Required API key for Google Gemini

## Validation

The configuration module automatically validates all parameters on load:
- Values outside valid ranges are rejected with warnings and defaults are used
- Missing required values (like GEMINI_API_KEY) throw errors
- All validation is tested in `ragConfig.test.js`

## Usage

```javascript
const ragConfig = require('./config/ragConfig');

console.log(ragConfig.chunkSize);      // 500
console.log(ragConfig.retrievalCount); // 4
```

## Testing

Run the configuration tests:
```bash
npm test -- config/ragConfig.test.js
```

All 17 tests validate the configuration requirements (6.1, 6.2, 6.3).
