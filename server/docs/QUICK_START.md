# RAG System Quick Start

Get the RAG chatbot running in 5 minutes!

## Step 1: Start ChromaDB (Docker)

```bash
cd server
docker run -d --name chromadb -p 8000:8000 -v "%cd%\data\chroma:/chroma/chroma" chromadb/chroma
```

**Verify:**
```bash
curl http://localhost:8000/api/v1/heartbeat
```

## Step 2: Ingest Documents

```bash
npm run ingest:docs
```

**Expected output:**
```
✓ Processed: 2-3 files
📄 Total Chunks: 20-30
```

## Step 3: Start Server

```bash
npm start
```

## Step 4: Test RAG Endpoint

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/rag-chat -Method Post -ContentType "application/json" -Body '{"message": "What is NextStep?"}'
```

**CMD:**
```bash
curl -X POST http://localhost:4000/api/rag-chat -H "Content-Type: application/json" -d "{\"message\": \"What is NextStep?\"}"
```

**Expected response:**
```json
{
  "response": "NextStep is an AI-powered job-matching platform...",
  "sources": [
    {
      "document": "README.md",
      "chunk": "NextStep is an AI-powered...",
      "score": 0.92
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

**ChromaDB not connecting?**
```bash
docker ps  # Check if running
docker logs chromadb  # Check logs
docker restart chromadb  # Restart
```

**Port 8000 in use?**
```bash
netstat -ano | findstr :8000
# Kill the process or use different port
```

**Need to reset everything?**
```bash
docker stop chromadb
docker rm chromadb
npm run clear-vector-store
# Then start from Step 1
```

## Daily Workflow

```bash
# Start ChromaDB (if not running)
docker start chromadb

# Start server
cd server
npm start

# That's it!
```

## Useful Commands

```bash
# Check RAG status
curl http://localhost:4000/api/rag-chat/status

# View ChromaDB logs
docker logs -f chromadb

# Re-ingest docs (after updates)
npm run clear-vector-store
npm run ingest:docs

# Run tests
npm test
```

## What's Next?

- Update frontend ChatWidget to use `/api/rag-chat` endpoint
- Display source citations in the UI
- Deploy to production

## Need Help?

- See `DOCKER_SETUP.md` for detailed Docker instructions
- See `INGESTION_GUIDE.md` for document ingestion details
- See `CHROMADB_SETUP.md` for ChromaDB configuration
