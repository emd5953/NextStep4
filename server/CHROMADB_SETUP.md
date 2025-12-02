# ChromaDB Setup Guide

The RAG chatbot requires a running ChromaDB server for vector storage and similarity search.

## Installation

ChromaDB has been installed via pip:
```bash
pip install chromadb
```

## Starting ChromaDB Server

### Method 1: Using Python Module (Recommended)
```bash
python -m chromadb.cli.cli run --path ./data/chroma --port 8000 --host localhost
```

### Method 2: Using chroma command (if available in PATH)
```bash
chroma run --path ./data/chroma --port 8000
```

### Method 3: Using the provided Node.js script
```bash
node scripts/start-chroma.js
```

## Verifying ChromaDB is Running

Check if the server is accessible:
```bash
curl http://localhost:8000/api/v1/heartbeat
```

Or visit `http://localhost:8000` in your browser.

## Configuration

The application connects to ChromaDB using these environment variables (in `.env`):
```
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
```

## Running Tests

Before running vector store tests, ensure ChromaDB is running:

```bash
# Terminal 1: Start ChromaDB
python -m chromadb.cli.cli run --path ./data/chroma --port 8000

# Terminal 2: Run tests
npm test -- services/vectorStoreService.test.js
```

## Troubleshooting

### "chroma: command not found"
The `chroma` CLI command may not be in your PATH. Use the Python module method instead:
```bash
python -m chromadb.cli.cli run --path ./data/chroma --port 8000
```

### Connection Refused
Make sure ChromaDB server is running before starting the application or running tests.

### Port Already in Use
If port 8000 is already in use, change the port in `.env`:
```
RAG_CHROMA_PORT=8001
```

And start ChromaDB on the new port:
```bash
python -m chromadb.cli.cli run --path ./data/chroma --port 8001
```

## Production Deployment

For production, consider:
1. Running ChromaDB as a system service
2. Using Docker for ChromaDB deployment
3. Using a managed ChromaDB service
4. Implementing health checks and automatic restarts

## Docker Option (Alternative)

You can also run ChromaDB using Docker:
```bash
docker run -p 8000:8000 -v ./data/chroma:/chroma/chroma chromadb/chroma
```

## Data Persistence

ChromaDB stores data in `./data/chroma` directory. This directory is:
- Created automatically on first run
- Excluded from git (via .gitignore)
- Persistent across server restarts

## Next Steps

Once ChromaDB is running, you can:
1. Run the vector store tests
2. Ingest documents into the knowledge base
3. Start the RAG chatbot service
