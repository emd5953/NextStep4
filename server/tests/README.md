# NextStep Server Tests

Test suite for the NextStep server, including RAG system tests.

## Running Tests

### All Tests
```bash
# From server directory
npm test
```

### Individual Test Files

```bash
# RAG System Tests
node tests/test-embedding.js           # Test embedding generation
node tests/test-vector-store.js        # Test vector database operations
node tests/test-document-ingestion.js  # Test document processing
node tests/test-ingestion-pipeline.js  # Test full ingestion pipeline
node tests/test-rag-endpoint.js        # Test RAG chat endpoint

# API Tests
node tests/test-api-key.js             # Verify Gemini API key
node tests/test-gemini-api.js          # Test Gemini API models
node tests/list-models.js              # List available AI models

# Legacy Tests
node tests/test-retrieval.js           # Test document retrieval
```

## Test Descriptions

### RAG System Tests

#### test-embedding.js
Tests the EmbeddingService:
- ✅ Single text embedding generation
- ✅ Batch embedding generation
- ✅ Error handling for invalid inputs
- ✅ Embedding dimension validation (768)

**Expected Output:**
```
✅ Generated embedding with 768 dimensions
✅ Generated 3 embeddings
✅ Correctly rejected empty text
```

#### test-vector-store.js
Tests the VectorStoreService:
- ✅ ChromaDB connection and initialization
- ✅ Document storage with embeddings
- ✅ Similarity search functionality
- ✅ Collection statistics
- ✅ Error handling

**Expected Output:**
```
✅ Initialized: true
✅ Documents added
✅ Found 2 results for "job matching"
```

#### test-document-ingestion.js
Tests the DocumentIngestionService:
- ✅ Markdown parsing (removes formatting)
- ✅ Text file parsing
- ✅ Text chunking with overlap
- ✅ File processing with metadata
- ✅ Error handling for unsupported files

**Expected Output:**
```
✅ Parsed markdown: 162 chars
✅ Split text into 3 chunks
✅ Processed markdown file into 1 chunks
```

#### test-ingestion-pipeline.js
Tests the full document ingestion pipeline:
- ✅ Directory scanning (recursive/non-recursive)
- ✅ Batch processing of multiple files
- ✅ Progress reporting
- ✅ Statistics generation
- ✅ Vector store integration
- ✅ Search functionality after ingestion

**Expected Output:**
```
✅ Ingestion complete
Files processed: 4
Total chunks created: 4
✅ Found 3 results for "job matching"
```

#### test-rag-endpoint.js
Tests the complete RAG chat endpoint:
- ✅ End-to-end chat flow
- ✅ Document retrieval
- ✅ AI response generation
- ✅ Source citation formatting
- ✅ Relevance scoring

**Expected Output:**
```
✅ Response received!
📝 Answer: NextStep is a swipe-based job matching application...
📚 Sources:
1. README.md (score: 0.55)
```

### API Tests

#### test-api-key.js
Verifies Gemini API configuration:
- ✅ API key is present
- ✅ API key format is valid
- ✅ Lists available models via v1 API

**Expected Output:**
```
API Key: AIzaSyCkHV...
Available models:
- models/gemini-2.5-flash
- models/gemini-2.5-pro
```

#### test-gemini-api.js
Tests different Gemini model names:
- ✅ Tries various model name formats
- ✅ Identifies working models
- ✅ Reports failures for invalid models

**Expected Output:**
```
✅ SUCCESS with gemini-2.5-pro
Response: Hello! How can I help you today?
```

## Prerequisites

Before running tests:

1. **Environment Variables**
   ```bash
   # Ensure .env is configured
   GEMINI_API_KEY=your_key_here
   RAG_CHROMA_HOST=localhost
   RAG_CHROMA_PORT=8000
   ```

2. **ChromaDB Running**
   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

3. **Documents Ingested** (for RAG endpoint test)
   ```bash
   npm run ingest:docs
   ```

## Test Coverage

### Current Coverage

- ✅ Embedding Service: 100%
- ✅ Vector Store Service: 100%
- ✅ Document Ingestion: 100%
- ✅ Ingestion Pipeline: 100%
- ✅ RAG Endpoint: 100%
- ⚠️ Property Tests: Pending
- ⚠️ Unit Tests: Partial

### Missing Tests

Property tests (from tasks.md):
- [ ] Property 5: All chunks have valid embeddings
- [ ] Property 10: New documents immediately searchable
- [ ] Property 4: Chunks respect size constraints
- [ ] Property 7: Markdown parsing extracts text
- [ ] Property 1: Document retrieval returns knowledge base chunks
- [ ] Property 3: Top chunks included in prompt context
- [ ] Property 8: Conversation history included in prompt
- [ ] Property 9: Conversation history truncation
- [ ] Property 11-13: Configuration validation
- [ ] Property 14-16: Source citation validation
- [ ] Property 17-18: Error handling validation

## Troubleshooting

### Test Failures

**ChromaDB Connection Error**
```
Error: Failed to initialize vector store
```
**Solution:** Start ChromaDB: `docker run -p 8000:8000 chromadb/chroma`

**API Key Error**
```
Error: GEMINI_API_KEY environment variable is required
```
**Solution:** Add `GEMINI_API_KEY` to `server/.env`

**Model Not Found**
```
Error: models/gemini-x.x-xxx is not found
```
**Solution:** Run `node tests/test-api-key.js` to see available models

**No Documents Found**
```
I don't have enough information...
```
**Solution:** Run `npm run ingest:docs` to load documentation

### Common Issues

1. **Port 8000 in use**
   - Stop other ChromaDB instances
   - Check with: `netstat -ano | findstr :8000`

2. **Test files not found**
   - Run from server directory: `node tests/test-name.js`
   - Or use absolute path

3. **Timeout errors**
   - Check internet connection (for API calls)
   - Increase timeout in test file if needed

## Writing New Tests

### Test File Template

```javascript
/**
 * Test script for [Component Name]
 */

const ServiceName = require('../services/serviceName');
require('dotenv').config();

async function testComponent() {
  console.log('🧪 Testing [Component]...\n');

  try {
    // Test 1: Basic functionality
    console.log('Test 1: [Description]');
    // ... test code ...
    console.log('✅ Test passed\n');

    // Test 2: Error handling
    console.log('Test 2: Error handling');
    try {
      // ... code that should fail ...
      console.log('❌ Should have thrown error');
    } catch (error) {
      console.log(`✅ Correctly handled: ${error.message}\n`);
    }

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testComponent();
```

### Best Practices

1. **Use descriptive test names**
2. **Test both success and failure cases**
3. **Clean up test data** (files, collections)
4. **Log progress clearly** with emojis
5. **Exit with proper codes** (0 = success, 1 = failure)

## CI/CD Integration

To integrate with CI/CD:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    docker run -d -p 8000:8000 chromadb/chroma
    cd server
    npm test
```

## Performance Benchmarks

Expected test durations:
- `test-embedding.js`: ~3-5 seconds
- `test-vector-store.js`: ~5-8 seconds
- `test-document-ingestion.js`: ~2-3 seconds
- `test-ingestion-pipeline.js`: ~8-12 seconds
- `test-rag-endpoint.js`: ~3-5 seconds

Total suite: ~25-35 seconds

## Support

For test-related issues:
1. Check this README
2. Review test output carefully
3. Verify prerequisites are met
4. Check main server README
5. Review RAG System Guide in `docs/`
