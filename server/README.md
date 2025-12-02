# NextStep Server

Backend server for the NextStep job matching platform with integrated RAG chatbot.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start ChromaDB (required for RAG)
docker run -p 8000:8000 chromadb/chroma

# Start server
npm start
```

Server runs on `http://localhost:4000`

## Features

- **User Authentication** - JWT-based auth with Google OAuth
- **Job Management** - CRUD operations for job postings
- **Application Tracking** - Track job applications and status
- **Messaging** - Real-time messaging between users and employers
- **RAG Chatbot** - AI-powered help chat with document retrieval
- **Notifications** - Email notifications via Mailjet

## Project Structure

```
server/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── data/            # Static data files
├── docs/            # Documentation
│   ├── RAG_SYSTEM_GUIDE.md
│   ├── CHROMADB_SETUP.md
│   ├── DOCKER_SETUP.md
│   ├── INGESTION_GUIDE.md
│   └── QUICK_START.md
├── middleware/      # Express middleware
├── routes/          # API routes
├── scripts/         # Utility scripts
│   ├── ingest-documents.js
│   └── clear-vector-store.js
├── services/        # Business logic
│   ├── embeddingService.js
│   ├── vectorStoreService.js
│   ├── documentIngestionService.js
│   ├── ragService.js
│   └── ragChatService.js
├── tests/           # Test files
└── server.js        # Main entry point
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/google` - Google OAuth login

### Jobs
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create job posting
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Applications
- `POST /api/applications` - Submit application
- `GET /api/applications/user/:userId` - Get user applications
- `PUT /api/applications/:id` - Update application status

### Chat (RAG)
- `POST /api/chat` - Send message to AI chatbot

### Messaging
- `GET /api/messages/:userId` - Get user messages
- `POST /api/messages` - Send message

## RAG Chatbot System

The server includes a sophisticated RAG (Retrieval-Augmented Generation) chatbot that provides intelligent answers based on your documentation.

### Setup

1. **Start ChromaDB:**
   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

2. **Configure API Key:**
   Add to `.env`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Ingest Documentation:**
   ```bash
   npm run ingest:docs
   ```

4. **Test:**
   ```bash
   cd tests
   node test-rag-endpoint.js
   ```

### Documentation

- **[RAG System Guide](docs/RAG_SYSTEM_GUIDE.md)** - Complete guide to the RAG system
- **[ChromaDB Setup](docs/CHROMADB_SETUP.md)** - Vector database setup
- **[Docker Setup](docs/DOCKER_SETUP.md)** - Docker configuration
- **[Ingestion Guide](docs/INGESTION_GUIDE.md)** - Document ingestion process

## Environment Variables

Required variables in `.env`:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email
MJ_API_KEY=your_mailjet_api_key
MJ_PRIVATE_KEY=your_mailjet_private_key
EMAIL_FROM=your_email@example.com

# AI/RAG
GEMINI_API_KEY=your_gemini_api_key
RAG_GENERATION_MODEL=gemini-2.5-pro
RAG_EMBEDDING_MODEL=text-embedding-004

# Vector Store
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
RAG_COLLECTION_NAME=nextstep_docs

# Server
PORT=4000
SERVER_DOMAIN=http://localhost:4000
```

## Scripts

```bash
# Development
npm start              # Start server with nodemon
npm run dev            # Same as start

# Testing
npm test               # Run Jest tests
npm run test:coverage  # Run tests with coverage

# RAG System
npm run ingest         # Ingest documents (custom path)
npm run ingest:docs    # Ingest from ../docs
npm run clear-vector-store  # Clear vector database

# Documentation
npm run docs           # Generate JSDoc documentation
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
cd tests
node test-embedding.js
node test-vector-store.js
node test-document-ingestion.js
node test-ingestion-pipeline.js
node test-rag-endpoint.js
```

## Development

### Adding New Routes

1. Create controller in `controllers/`
2. Create route in `routes/`
3. Register route in `server.js`

### Adding New Services

1. Create service in `services/`
2. Export service class
3. Import and use in controllers

### Updating RAG Documentation

1. Add/update markdown files in `../docs`
2. Run ingestion script:
   ```bash
   npm run ingest:docs
   ```
3. Test with chat endpoint

## Troubleshooting

### ChromaDB Connection Failed
- Ensure ChromaDB is running: `docker ps`
- Check port 8000 is available
- Verify `RAG_CHROMA_HOST` and `RAG_CHROMA_PORT` in `.env`

### RAG Chatbot Not Responding
- Check Gemini API key is valid
- Verify vector store has documents: see RAG System Guide
- Check server logs for errors

### MongoDB Connection Issues
- Verify `MONGODB_URI` in `.env`
- Check MongoDB Atlas whitelist
- Ensure network connectivity

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Vector Store:** ChromaDB
- **AI Models:** Google Gemini 2.5 Pro, text-embedding-004
- **Authentication:** JWT, Passport.js
- **Email:** Mailjet
- **Testing:** Jest, Supertest

## Contributing

1. Create feature branch
2. Make changes
3. Write/update tests
4. Submit pull request

## License

ISC

## Support

For issues or questions:
- Check documentation in `docs/`
- Review test files in `tests/`
- Check server logs
- Contact team lead
