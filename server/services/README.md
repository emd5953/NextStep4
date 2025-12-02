# RAG Services

This directory contains the core services for the RAG (Retrieval-Augmented Generation) chatbot system.

## Services

### EmbeddingService
Generates vector embeddings for text using Google's text-embedding-004 model.

**Features:**
- Single text embedding
- Batch embedding processing
- Input validation and error handling
- 768-dimensional vectors

### VectorStoreService
Manages vector database operations using ChromaDB for storing and retrieving document embeddings.

**Features:**
- Document storage with metadata
- Semantic similarity search
- Collection management
- Statistics and monitoring

## ChromaDB Setup

The VectorStoreService requires a running ChromaDB server.

### Installation

Install ChromaDB Python package:
```bash
pip install chromadb
# or
pip3 install chromadb
```

### Starting ChromaDB Server

**Option 1: Using the provided script**
```bash
node scripts/start-chroma.js
```

**Option 2: Manual start**
```bash
chroma run --path ./data/chroma --port 8000
```

The server will be available at `http://localhost:8000`.

### Configuration

ChromaDB connection settings in `.env`:
```
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
```

### Testing

Before running tests, make sure ChromaDB server is running:

```bash
# Terminal 1: Start ChromaDB
node scripts/start-chroma.js

# Terminal 2: Run tests
npm test -- services/vectorStoreService.test.js
```

## Usage Example

```javascript
const VectorStoreService = require('./services/vectorStoreService');

// Initialize
const vectorStore = new VectorStoreService();
await vectorStore.initialize();

// Add documents
await vectorStore.addDocuments([
  {
    text: 'NextStep is a job matching platform.',
    metadata: { source: 'about.md', chunkIndex: 0 }
  }
]);

// Search
const results = await vectorStore.similaritySearch('job platform', 5);
console.log(results);

// Get stats
const stats = await vectorStore.getStats();
console.log(`Collection has ${stats.count} documents`);
```

## Requirements

- Node.js 14+
- Python 3.7+ (for ChromaDB)
- ChromaDB Python package
- Google Gemini API key (for embeddings)
