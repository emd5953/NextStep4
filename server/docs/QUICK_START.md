# RAG System Quick Start

Get the RAG chatbot running in 5 minutes!

## Prerequisites

- Node.js installed
- Docker installed
- MongoDB connection configured in `.env`
- API keys configured (GEMINI_API_KEY, OPENAI_API_KEY)

## Step 1: Configure Environment Variables

Create/update `server/.env`:

```env
# Database
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# AI Services
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# RAG Configuration
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
RAG_COLLECTION_NAME=nextstep_docs
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50
RAG_RETRIEVAL_COUNT=4
RAG_SIMILARITY_THRESHOLD=0.3
RAG_MAX_HISTORY=5
RAG_EMBEDDING_MODEL=text-embedding-004
RAG_GENERATION_MODEL=gemini-2.5-flash
```

## Step 2: Start ChromaDB (Docker)

```bash
cd docker
docker-compose up -d
```

**Verify:**
```bash
curl http://localhost:8000/api/v2/heartbeat
```

## Step 3: Ingest Documents

```bash
cd server
npm run ingest:docs
```

**Expected output:**
```
✓ Files processed: 23
✓ Total chunks created: 296
📊 Vector store now contains: 404 chunks
```

## Step 4: Start Server

```bash
npm start
```

## Step 5: Test RAG Endpoint

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/rag-chat/status -Method Get
```

**Test chat:**
```powershell
$body = @{ message = "What is NextStep?" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:5000/api/rag-chat -Method Post -ContentType "application/json" -Body $body
```

**Expected response:**
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

## Troubleshooting

**ChromaDB not connecting?**
```bash
cd docker
docker-compose ps  # Check if running
docker-compose logs chromadb  # Check logs
docker-compose restart chromadb  # Restart
```

**Port 8000 in use?**
```bash
netstat -ano | findstr :8000
# Kill the process or change port in docker-compose.yml
```

**Need to reset everything?**
```bash
cd docker
docker-compose down
docker-compose up -d
cd ../server
npm run ingest:docs
```

## Daily Workflow

```bash
# Start ChromaDB (if not running)
cd docker
docker-compose up -d

# Start server
cd ../server
npm start

# That's it!
```

## Useful Commands

```bash
# Check RAG status
curl http://localhost:5000/api/rag-chat/status

# View ChromaDB logs
cd docker
docker-compose logs -f chromadb

# Re-ingest docs (after updates)
cd server
npm run ingest:docs

# Run tests
npm test
```

## What's Next?

- Test the chatbot in your frontend
- Provide feedback using 👍/👎 buttons
- Add more documentation as needed

## Need Help?

- See `DOCKER_SETUP.md` for detailed Docker instructions
- See `INGESTION_GUIDE.md` for document ingestion details
- See `CHROMADB_SETUP.md` for ChromaDB configuration
- See `RAG_SYSTEM_GUIDE.md` for technical details
