# Document Ingestion Guide

This guide explains how to ingest documentation into the RAG system's vector store.

## Prerequisites

### 1. Install ChromaDB

ChromaDB requires Python 3.7+. Install it using pip:

```bash
pip install chromadb
```

### 2. Start ChromaDB Server

ChromaDB needs to run as a server. There are several ways to start it:

#### Option A: Using Docker (Recommended)

```bash
cd docker
docker-compose up -d
```

Or manually:
```bash
docker run -p 8000:8000 -v ./chroma_data:/chroma/chroma chromadb/chroma
```

#### Option B: Using Python Module

```bash
# From the server directory
python -m chromadb.cli.cli run --path ./data/chroma --port 8000 --host localhost
```

#### Option C: Using uvicorn directly

```bash
# Install uvicorn if not already installed
pip install uvicorn

# Start ChromaDB server
uvicorn chromadb.app:app --host localhost --port 8000
```

### 3. Verify ChromaDB is Running

Test the connection:

```bash
curl http://localhost:8000/api/v2/heartbeat
```

You should see: `{"nanosecond heartbeat":...}`

## Ingestion Process

### Step 1: Prepare Your Documents

The ingestion script supports:
- **Markdown files** (`.md`)
- **Text files** (`.txt`)

Place your documentation in a directory. For NextStep, we use the `docs/` directory which contains:
- `README.md` - Project overview and features
- `requirements.md` - Detailed requirements
- Other markdown documentation

### Step 2: Run the Ingestion Script

```bash
# From the server directory

# Ingest from the docs directory
npm run ingest:docs

# Or ingest from a custom directory
npm run ingest ../path/to/your/docs
```

### Step 3: Verify Ingestion

Check the ingestion results in the console output. You should see:
- Number of files processed
- Total chunks created
- Any errors encountered

You can also check the vector store status:

```bash
curl http://localhost:4000/api/rag-chat/status
```

## What Gets Ingested

For NextStep, the following documents are ingested:

### From `/docs` folder:
- Migration guides (EMPLOYER_REMOVAL_MIGRATION.md, MIGRATION_GUIDE.md, etc.)
- Setup guides (REAL_JOBS_SETUP.md, JSEARCH_PERFORMANCE_OPTIMIZATIONS.md)
- Design guides (MINIMALIST_MONOCHROME_GUIDE.md, TRANSFORMATION_PROGRESS.md)
- Project summaries (FINAL_CLEANUP_SUMMARY.md, QUICK_FIX_GUIDE.md)

### From `/server/docs` folder:
- **User Guides** (8 files):
  - how-to-apply-jobs.md
  - how-to-withdraw-application.md
  - how-to-create-profile.md
  - how-to-search-jobs.md
  - how-to-check-progress.md
  - staying-motivated.md
  - common-questions.md
  - complete-feature-guide.md

- **FAQ** (faq.md) - Frequently asked questions

- **RAG System Documentation**:
  - RAG_SYSTEM_GUIDE.md - Technical guide
  - SELF_IMPROVING_RAG.md - Self-improvement features
  - RAG_IMPROVEMENTS.md - Improvement roadmap
  - IMPROVEMENTS_COMPLETED.md - Recent features
  - RAG_CHATBOT_PRESENTATION.md - Presentation materials

- **Developer Guides**:
  - QUICK_START.md - Quick setup
  - PROJECT_STRUCTURE.md - Codebase organization
  - CHROMADB_SETUP.md - Vector database setup
  - DOCKER_SETUP.md - Docker configuration
  - AWS_DEPLOYMENT.md - Production deployment
  - CI_CD_PIPELINE.md - CI/CD setup
  - PERFORMANCE_OPTIMIZATIONS.md - Performance tips
  - SUMMARY.md - Project summary

**Total:** ~24 documentation files ingested into 404 chunks

## Ingestion Details

### Document Processing

Each document goes through:

1. **Parsing**
   - Markdown: Removes syntax, preserves content
   - Text: Normalizes whitespace

2. **Chunking**
   - Split into 500-character chunks
   - 50-character overlap between chunks
   - Preserves context across boundaries

3. **Embedding Generation**
   - Uses Google text-embedding-004
   - Creates 768-dimensional vectors
   - Captures semantic meaning

4. **Storage**
   - Stores in ChromaDB vector database
   - Includes metadata (source, chunk index, timestamp)
   - Enables semantic similarity search

### Metadata Stored

Each chunk includes:
- `source`: Filename (e.g., "README.md")
- `sourcePath`: Full file path
- `chunkIndex`: Position in document (0, 1, 2, ...)
- `totalChunks`: Total chunks from this document
- `documentType`: File extension ("md" or "txt")
- `processedAt`: ISO timestamp

## Troubleshooting

### ChromaDB Connection Failed

**Error:** `Failed to connect to chromadb`

**Solutions:**
1. Verify ChromaDB is running: `curl http://localhost:8000/api/v1/heartbeat`
2. Check port 8000 is not in use: `netstat -an | findstr 8000` (Windows) or `lsof -i :8000` (Mac/Linux)
3. Try restarting ChromaDB server
4. Check firewall settings

### Embedding Generation Failed

**Error:** `Failed to generate embedding`

**Solutions:**
1. Verify `GEMINI_API_KEY` is set in `.env`
2. Check API key is valid
3. Verify internet connection
4. Check Google AI API quota/limits

### No Files Found

**Error:** `0 files processed`

**Solutions:**
1. Verify directory path is correct
2. Ensure directory contains `.md` or `.txt` files
3. Check file permissions
4. Try absolute path instead of relative

### Slow Ingestion

**Causes:**
- Large files take longer to process
- API rate limiting for embeddings
- Network latency

**Solutions:**
- Split very large documents
- Process in smaller batches
- Check network connection

## Re-Ingestion

To update the knowledge base after documentation changes:

```bash
# Just re-run ingestion (it will add new/updated docs)
cd server
npm run ingest:docs
```

**Note:** The system handles updates intelligently. You don't need to clear the vector store unless you want to completely rebuild it.

## Testing the RAG System

After ingestion, test the system:

```bash
# Start the server
npm start

# Test the RAG endpoint
curl -X POST http://localhost:5000/api/rag-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is NextStep?"
  }'
```

Expected response:
```json
{
  "response": "NextStep is an AI-powered job-matching platform...",
  "sources": [
    {
      "document": "faq.md",
      "content": "NextStep is...",
      "score": 0.85
    }
  ],
  "type": "documentation",
  "timestamp": "2026-01-13T..."
}
```

## Production Considerations

For production deployment:

1. **Use Docker for ChromaDB**
   - More reliable than CLI
   - Easier to manage
   - Better for containerized deployments

2. **Persistent Storage**
   - Ensure `./chroma_data` is backed up
   - Use Docker volumes for persistence
   - Consider cloud storage for vectors

3. **Monitoring**
   - Monitor ChromaDB health
   - Track ingestion success/failure
   - Alert on service unavailability

4. **Automation**
   - Schedule regular re-ingestion
   - Automate on documentation updates
   - CI/CD integration

5. **Scaling**
   - Consider managed vector database services
   - Implement caching for frequent queries
   - Load balance if needed

## Next Steps

After successful ingestion:

1. ✅ Documents are in vector store
2. ✅ RAG system is ready
3. ✅ Start the application server
4. ✅ Test the chat endpoint
5. ✅ Update frontend to use RAG endpoint
6. ✅ Deploy to production

## Support

For issues or questions:
- Check ChromaDB documentation: https://docs.trychroma.com/
- Review server logs for detailed errors
- Verify all environment variables are set
- Test with a small document set first
