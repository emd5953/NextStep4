# NextStep Server - Project Structure

## Directory Organization

```
server/
├── config/              # Configuration files
│   └── ragConfig.js     # RAG system configuration
│
├── controllers/         # Request handlers
│   └── ragChatController.js  # RAG chat endpoint handler
│
├── data/               # Static data files
│
├── docs/               # 📚 Documentation (YOU ARE HERE)
│   ├── CHROMADB_SETUP.md      # Vector database setup guide
│   ├── DOCKER_SETUP.md        # Docker configuration guide
│   ├── INGESTION_GUIDE.md     # Document ingestion guide
│   ├── PROJECT_STRUCTURE.md   # This file
│   ├── QUICK_START.md         # Quick start guide
│   └── RAG_SYSTEM_GUIDE.md    # Complete RAG system guide
│
├── middleware/         # Express middleware
│
├── public/            # Static files
│
├── routes/            # API routes
│   └── ragChatRoutes.js  # RAG chat routes
│
├── scripts/           # 🛠️ Utility scripts
│   ├── ingest-documents.js    # Document ingestion CLI
│   └── clear-vector-store.js  # Clear vector database
│
├── services/          # 🧠 Business logic
│   ├── embeddingService.js           # Text embedding generation
│   ├── vectorStoreService.js         # Vector database operations
│   ├── documentIngestionService.js   # Document processing & chunking
│   ├── ragService.js                 # RAG core logic
│   └── ragChatService.js             # RAG chat orchestration
│
├── tests/             # 🧪 Test files
│   ├── README.md                     # Test documentation
│   ├── test-embedding.js             # Embedding service tests
│   ├── test-vector-store.js          # Vector store tests
│   ├── test-document-ingestion.js    # Document processing tests
│   ├── test-ingestion-pipeline.js    # Full pipeline tests
│   ├── test-rag-endpoint.js          # RAG endpoint tests
│   ├── test-api-key.js               # API key verification
│   ├── test-gemini-api.js            # Gemini API tests
│   └── list-models.js                # List available models
│
├── .env               # Environment variables (not in git)
├── .gitignore         # Git ignore rules
├── package.json       # Dependencies and scripts
├── README.md          # Main server documentation
└── server.js          # 🚀 Main entry point
```

## Key Files

### Entry Point
- **server.js** - Main application entry point, Express server setup

### Configuration
- **.env** - Environment variables (API keys, database URLs)
- **config/ragConfig.js** - RAG system configuration with validation

### Core Services

#### RAG System
1. **embeddingService.js** - Converts text to 768-dimensional vectors
2. **vectorStoreService.js** - Manages ChromaDB storage and retrieval
3. **documentIngestionService.js** - Processes and chunks documents
4. **ragService.js** - Orchestrates retrieval and generation
5. **ragChatService.js** - High-level chat interface

#### Controllers
- **ragChatController.js** - Handles `/api/chat` endpoint requests

#### Routes
- **ragChatRoutes.js** - Defines RAG chat API routes

### Scripts

#### Production Scripts
- **ingest-documents.js** - CLI tool for ingesting documentation
  ```bash
  npm run ingest:docs
  ```

- **clear-vector-store.js** - Utility to clear vector database
  ```bash
  npm run clear-vector-store
  ```

### Documentation

#### Getting Started
1. **README.md** - Main server documentation
2. **QUICK_START.md** - Quick setup guide
3. **docs/PROJECT_STRUCTURE.md** - This file

#### RAG System
1. **RAG_SYSTEM_GUIDE.md** - Complete RAG system guide
2. **INGESTION_GUIDE.md** - Document ingestion process
3. **CHROMADB_SETUP.md** - Vector database setup
4. **DOCKER_SETUP.md** - Docker configuration

#### Testing
- **tests/README.md** - Test suite documentation

## Data Flow

### Document Ingestion Flow
```
Markdown/Text Files
    ↓
DocumentIngestionService (parse & chunk)
    ↓
EmbeddingService (generate vectors)
    ↓
VectorStoreService (store in ChromaDB)
    ↓
Ready for Retrieval
```

### Chat Request Flow
```
User Question
    ↓
POST /api/chat
    ↓
ragChatController
    ↓
RAGService.generateResponse()
    ├─→ VectorStoreService.similaritySearch() (retrieve docs)
    ├─→ Format prompt with context
    └─→ Gemini API (generate response)
    ↓
Response + Sources
    ↓
Frontend (ChatWidget)
```

## File Naming Conventions

### Services
- **Pattern:** `[feature]Service.js`
- **Example:** `embeddingService.js`, `vectorStoreService.js`
- **Location:** `services/`

### Controllers
- **Pattern:** `[feature]Controller.js`
- **Example:** `ragChatController.js`
- **Location:** `controllers/`

### Routes
- **Pattern:** `[feature]Routes.js`
- **Example:** `ragChatRoutes.js`
- **Location:** `routes/`

### Tests
- **Pattern:** `test-[feature].js`
- **Example:** `test-embedding.js`, `test-rag-endpoint.js`
- **Location:** `tests/`

### Scripts
- **Pattern:** `[action]-[target].js`
- **Example:** `ingest-documents.js`, `clear-vector-store.js`
- **Location:** `scripts/`

### Documentation
- **Pattern:** `[TOPIC]_[TYPE].md` (uppercase)
- **Example:** `RAG_SYSTEM_GUIDE.md`, `QUICK_START.md`
- **Location:** `docs/`

## Environment Variables

Located in `.env` (not committed to git):

```env
# Required for RAG System
GEMINI_API_KEY=           # Google AI API key
RAG_CHROMA_HOST=          # ChromaDB host (default: localhost)
RAG_CHROMA_PORT=          # ChromaDB port (default: 8000)

# Optional RAG Configuration
RAG_GENERATION_MODEL=     # AI model (default: gemini-2.5-pro)
RAG_EMBEDDING_MODEL=      # Embedding model (default: text-embedding-004)
RAG_CHUNK_SIZE=           # Chunk size (default: 500)
RAG_CHUNK_OVERLAP=        # Overlap % (default: 50)
RAG_RETRIEVAL_COUNT=      # Docs to retrieve (default: 4)
RAG_SIMILARITY_THRESHOLD= # Min similarity (default: 0.3)
RAG_COLLECTION_NAME=      # Collection name (default: nextstep_docs)
RAG_MAX_HISTORY=          # Max history (default: 5)

# Other Services
MONGODB_URI=              # MongoDB connection
JWT_SECRET=               # JWT secret key
MJ_API_KEY=               # Mailjet API key
MJ_PRIVATE_KEY=           # Mailjet private key
EMAIL_FROM=               # Sender email
```

## NPM Scripts

```json
{
  "start": "nodemon server.js",           // Start dev server
  "dev": "nodemon server.js",             // Same as start
  "test": "jest",                         // Run Jest tests
  "test:coverage": "jest --coverage",     // Tests with coverage
  "docs": "jsdoc -c jsdoc.json",         // Generate JSDoc
  "ingest": "node scripts/ingest-documents.js",           // Ingest docs
  "ingest:docs": "node scripts/ingest-documents.js ../docs", // Ingest from ../docs
  "clear-vector-store": "node scripts/clear-vector-store.js" // Clear vector DB
}
```

## Dependencies

### Core
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **dotenv** - Environment variables

### RAG System
- **chromadb** - Vector database client
- **@google/generative-ai** - Gemini AI SDK
- **@langchain/google-genai** - LangChain Gemini integration

### Authentication
- **jsonwebtoken** - JWT tokens
- **passport** - Authentication middleware
- **bcrypt** - Password hashing

### Communication
- **node-mailjet** - Email service
- **twilio** - SMS service

### Development
- **nodemon** - Auto-restart server
- **jest** - Testing framework
- **supertest** - API testing

## Quick Reference

### Start Development
```bash
cd server
npm install
docker run -p 8000:8000 chromadb/chroma
npm start
```

### Ingest Documentation
```bash
npm run ingest:docs
```

### Run Tests
```bash
npm test
# or
node tests/test-rag-endpoint.js
```

### Check Vector Store
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

## Getting Help

1. **Quick Start:** Read `QUICK_START.md`
2. **RAG System:** Read `RAG_SYSTEM_GUIDE.md`
3. **Tests:** Read `tests/README.md`
4. **Main Docs:** Read `README.md`
5. **Issues:** Check server logs and error messages

## Contributing

When adding new features:

1. **Create service** in `services/`
2. **Create controller** in `controllers/`
3. **Create routes** in `routes/`
4. **Add tests** in `tests/`
5. **Update docs** in `docs/`
6. **Update README.md** with new features

## Version History

- **v1.0** - Initial RAG system implementation
  - Embedding service
  - Vector store integration
  - Document ingestion pipeline
  - RAG chat endpoint
  - Frontend integration
  - Comprehensive documentation

## Maintenance

### Regular Tasks
- **Weekly:** Review error logs
- **Monthly:** Re-ingest documentation
- **Quarterly:** Update dependencies
- **As needed:** Clear vector store and re-ingest

### Monitoring
- Check ChromaDB is running
- Verify API keys are valid
- Monitor response times
- Review source quality

---

**Last Updated:** December 2024  
**Maintained By:** NextStep Development Team
