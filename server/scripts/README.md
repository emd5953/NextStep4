# RAG Document Ingestion Scripts

This directory contains utility scripts for managing the RAG (Retrieval-Augmented Generation) system's knowledge base.

## Scripts

### ingest-documents.js

Ingests documents from a directory into the vector store for RAG retrieval.

**Usage:**
```bash
# Using npm script (recommended)
npm run ingest <directory-path>
npm run ingest:docs  # Shortcut for ../docs directory

# Direct execution
node scripts/ingest-documents.js <directory-path>
node scripts/ingest-documents.js ../docs
```

**What it does:**
1. Connects to the ChromaDB vector store
2. Scans the specified directory for `.md` and `.txt` files
3. Processes each file:
   - Parses markdown/text content
   - Splits into chunks (500 chars with 50 char overlap)
   - Generates embeddings using Google text-embedding-004
   - Stores in vector database with metadata
4. Reports statistics and any errors

**Requirements:**
- ChromaDB server must be running
- GEMINI_API_KEY must be set in `.env`
- Directory must contain `.md` or `.txt` files

### clear-vector-store.js

Clears all documents from the vector store.

**Usage:**
```bash
# Using npm script (recommended)
npm run clear-vector-store

# Direct execution
node scripts/clear-vector-store.js
```

**What it does:**
1. Connects to the ChromaDB vector store
2. Displays current document count
3. Clears all documents from the collection
4. Verifies the collection is empty

**Use cases:**
- Before re-ingesting documents to start fresh
- Removing outdated documentation
- Testing with different document sets

### start-chroma.js

Starts a local ChromaDB server (if needed).

**Usage:**
```bash
node scripts/start-chroma.js
```

**What it does:**
- Starts ChromaDB server on port 8000
- Uses `./data/chroma` for storage
- Keeps running until stopped with Ctrl+C

## Workflow

### Initial Setup

1. **Start ChromaDB server:**
   ```bash
   python -m chromadb.cli.cli run --path ./data/chroma --port 8000
   ```

2. **Ingest documents:**
   ```bash
   npm run ingest:docs
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

### Updating Documentation

1. **Clear existing documents:**
   ```bash
   npm run clear-vector-store
   ```

2. **Re-ingest updated documents:**
   ```bash
   npm run ingest:docs
   ```

3. **Restart the application** (if running)

### Testing with Different Documents

```bash
# Clear current documents
npm run clear-vector-store

# Ingest from a different directory
npm run ingest ./path/to/test/docs

# Test the RAG system
curl -X POST http://localhost:4000/api/rag-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is NextStep?"}'
```

## Supported File Formats

- **Markdown (`.md`)**: Parses and removes markdown syntax while preserving content
- **Text (`.txt`)**: Processes plain text files

## Configuration

Settings are controlled via environment variables in `.env`:

```env
# RAG Configuration
RAG_CHUNK_SIZE=500              # Chunk size (100-2000)
RAG_CHUNK_OVERLAP=50            # Overlap in characters (0-50)
RAG_EMBEDDING_MODEL=text-embedding-004
GEMINI_API_KEY=your_api_key_here

# ChromaDB Configuration
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
RAG_COLLECTION_NAME=nextstep_docs
```

## Troubleshooting

### "Failed to initialize vector store"
- Ensure ChromaDB server is running
- Check that port 8000 is not in use
- Verify `RAG_CHROMA_HOST` and `RAG_CHROMA_PORT` in `.env`

### "Failed to generate embedding"
- Check that `GEMINI_API_KEY` is set in `.env`
- Verify API key is valid
- Check internet connection

### "No files found" or "0 files processed"
- Verify directory path is correct
- Ensure directory contains `.md` or `.txt` files
- Check file permissions

### Slow ingestion
- Large files take longer to process
- Embedding generation requires API calls (rate limited)
- Consider splitting very large documents

## Output Example

```
============================================================
  NextStep RAG Document Ingestion
============================================================

📁 Target Directory: /path/to/docs

🔧 Initializing vector store...
✓ Vector store initialized

📊 Current Vector Store Stats:
   Collection: nextstep_docs
   Documents: 0
   Embedding Model: text-embedding-004

🔧 Initializing ingestion service...
✓ Ingestion service initialized

📥 Starting document ingestion...
------------------------------------------------------------

Starting document ingestion from: /path/to/docs
Found 5 files to process
Processing 5 supported files
Processing: /path/to/docs/README.md
✓ Processed /path/to/docs/README.md: 3 chunks
Processing: /path/to/docs/requirements.md
✓ Processed /path/to/docs/requirements.md: 8 chunks
...

============================================================
  Ingestion Complete
============================================================

📈 Results:
   ✓ Processed: 5 files
   ✗ Failed: 0 files
   📄 Total Chunks: 24
   ⏱️  Duration: 12.34s

📊 Updated Vector Store Stats:
   Documents: 24 (+24)

✅ Ingestion completed successfully!

Next steps:
  1. Start the server: npm start
  2. Test the RAG chat: POST /api/rag-chat
  3. Check status: GET /api/rag-chat/status
```

## Notes

- Ingestion is additive - it doesn't remove existing documents
- Use `clear-vector-store` before re-ingesting to avoid duplicates
- Chunk metadata includes source file, chunk index, and timestamps
- Embeddings are generated using Google's text-embedding-004 model (768 dimensions)
