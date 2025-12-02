# Docker Setup for ChromaDB

This guide will help you get ChromaDB running with Docker for the RAG system.

## Prerequisites

- Docker Desktop installed and running
- Windows: Make sure Docker Desktop is started

## Quick Start

### 1. Start ChromaDB Container

```bash
# From the server directory
cd server

# Start ChromaDB (this will download the image first time)
docker run -d --name chromadb -p 8000:8000 -v "%cd%\data\chroma:/chroma/chroma" chromadb/chroma
```

**For PowerShell:**
```powershell
docker run -d --name chromadb -p 8000:8000 -v "${PWD}\data\chroma:/chroma/chroma" chromadb/chroma
```

### 2. Verify ChromaDB is Running

```bash
# Check if container is running
docker ps

# Test the API
curl http://localhost:8000/api/v1/heartbeat
```

You should see: `{"nanosecond heartbeat": ...}`

### 3. Run Tests

```bash
# Run all tests (including vector store tests)
npm test
```

### 4. Ingest Documents

```bash
# Ingest the documentation
npm run ingest:docs
```

### 5. Start the Server

```bash
# Start the NextStep server
npm start
```

### 6. Test the RAG Endpoint

```bash
# Test with curl
curl -X POST http://localhost:4000/api/rag-chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"What is NextStep?\"}"
```

**For PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/rag-chat -Method Post -ContentType "application/json" -Body '{"message": "What is NextStep?"}'
```

## Docker Commands

### Stop ChromaDB
```bash
docker stop chromadb
```

### Start ChromaDB (after stopping)
```bash
docker start chromadb
```

### Remove ChromaDB Container
```bash
docker stop chromadb
docker rm chromadb
```

### View ChromaDB Logs
```bash
docker logs chromadb
```

### View Live Logs
```bash
docker logs -f chromadb
```

## Troubleshooting

### Port Already in Use
If port 8000 is already in use:

```bash
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process or use a different port
docker run -d --name chromadb -p 8001:8000 -v "%cd%\data\chroma:/chroma/chroma" chromadb/chroma

# Update .env file
RAG_CHROMA_PORT=8001
```

### Container Won't Start
```bash
# Check logs
docker logs chromadb

# Remove and recreate
docker rm chromadb
docker run -d --name chromadb -p 8000:8000 -v "%cd%\data\chroma:/chroma/chroma" chromadb/chroma
```

### Volume Mount Issues
If you get volume mount errors on Windows:

1. Open Docker Desktop
2. Go to Settings → Resources → File Sharing
3. Add your project directory
4. Restart Docker Desktop

### Can't Connect to ChromaDB
```bash
# Check if container is running
docker ps

# Check if port is accessible
curl http://localhost:8000/api/v1/heartbeat

# Restart container
docker restart chromadb
```

## Data Persistence

Your vector data is stored in `./data/chroma` and persists even when the container is stopped or removed.

To completely reset:
```bash
docker stop chromadb
docker rm chromadb
rmdir /s /q data\chroma
mkdir data\chroma
docker run -d --name chromadb -p 8000:8000 -v "%cd%\data\chroma:/chroma/chroma" chromadb/chroma
```

## Next Steps

Once ChromaDB is running:

1. ✅ Run tests: `npm test`
2. ✅ Ingest docs: `npm run ingest:docs`
3. ✅ Start server: `npm start`
4. ✅ Test RAG: POST to `/api/rag-chat`
5. ✅ Update frontend (Task 15)

## Production Notes

For production:
- Use Docker Compose for easier management
- Set up health checks
- Configure proper volumes and backups
- Use environment variables for configuration
- Consider managed ChromaDB services for scale
