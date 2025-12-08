# NextStep Server - Project Structure

## Directory Organization

```
server/
├── config/              # ⚙️ Configuration files
│   └── ragConfig.js     # RAG system configuration
│
├── controllers/         # 🎮 Request handlers
│   ├── authController.js              # Authentication & signup
│   ├── profileController.js           # User profiles
│   ├── jobsController.js              # Job CRUD + semantic search
│   ├── applicationsController.js      # Job applications + withdrawal
│   ├── messagesController.js          # User messaging
│   ├── employerMessagingController.js # Employer messaging
│   ├── companyController.js           # Company profiles
│   └── ragChatController.js           # RAG chatbot API
│
├── data/               # 📊 Static data files
│
├── docs/               # 📚 Documentation (YOU ARE HERE)
│   ├── user-guides/                   # User documentation
│   │   ├── how-to-apply-jobs.md
│   │   ├── how-to-withdraw-application.md
│   │   ├── how-to-create-profile.md
│   │   ├── how-to-search-jobs.md
│   │   ├── how-to-message-employers.md
│   │   └── complete-feature-guide.md
│   ├── employer-guides/               # Employer documentation
│   │   ├── how-to-post-jobs.md
│   │   ├── how-to-review-applications.md
│   │   └── employer-complete-guide.md
│   ├── faq.md                         # Frequently asked questions
│   ├── SELF_IMPROVING_RAG.md          # Self-improving RAG guide
│   ├── IMPROVEMENTS_COMPLETED.md      # Recent improvements
│   ├── RAG_IMPROVEMENTS.md            # Improvement roadmap
│   ├── RAG_SYSTEM_GUIDE.md            # RAG technical guide
│   ├── RAG_CHATBOT_PRESENTATION.md    # RAG presentation
│   ├── CHROMADB_SETUP.md              # Vector database setup
│   ├── DOCKER_SETUP.md                # Docker configuration
│   ├── AWS_DEPLOYMENT.md              # AWS deployment guide
│   ├── INGESTION_GUIDE.md             # Document ingestion guide
│   ├── PROJECT_STRUCTURE.md           # This file
│   ├── QUICK_START.md                 # Quick start guide
│   └── SUMMARY.md                     # Project summary
│
├── middleware/         # 🛡️ Express middleware
│   ├── auth.js                        # JWT verification
│   ├── mailer.js                      # Email service
│   ├── genAI.js                       # AI utilities
│   ├── contentFilter.js               # Content moderation
│   └── AnalyzePdf.js                  # Resume analysis
│
├── public/            # 🌐 Static files
│
├── routes/            # 🛣️ API routes
│   ├── chatRoutes.js                  # Basic chat routes
│   ├── ragChatRoutes.js               # RAG chat routes
│   └── companyRoutes.js               # Company routes
│
├── scripts/           # 🔨 Utility scripts
│   ├── ingest-documents.js            # Document ingestion CLI
│   ├── clear-vector-store.js          # Clear vector database
│   └── feedback-report.js             # Generate feedback reports
│
├── services/          # 🧠 Business logic
│   ├── embeddingService.js            # Text embedding generation
│   ├── vectorStoreService.js          # Vector database operations
│   ├── documentIngestionService.js    # Document processing & chunking
│   ├── ragService.js                  # RAG core logic (self-improving!)
│   └── feedbackAnalyzer.js            # Feedback analysis & alerts
│
├── tests/             # 🧪 Test files
│   ├── README.md                      # Test documentation
│   ├── test-embedding.js              # Embedding service tests
│   ├── test-vector-store.js           # Vector store tests
│   ├── test-document-ingestion.js     # Document processing tests
│   ├── test-ingestion-pipeline.js     # Full pipeline tests
│   ├── test-rag-endpoint.js           # RAG endpoint tests
│   ├── test-retrieval.js              # Retrieval tests
│   ├── test-api-key.js                # API key verification
│   ├── test-gemini-api.js             # Gemini API tests
│   └── list-models.js                 # List available models
│
├── .env               # Environment variables (not in git)
├── .gitignore         # Git ignore rules
├── package.json       # Dependencies and scripts
├── README.md          # Main server documentation
└── server.js          # 🚀 Main entry point
```

## Key Files

### Entry Point
- **server.js** - Main application entry point, Express server setup, all routes defined here

### Configuration
- **.env** - Environment variables (API keys, database URLs, RAG config)
- **config/ragConfig.js** - RAG system configuration with validation

### Controllers (Request Handlers)

#### Authentication & Users
- **authController.js** - Signup, signin, Google OAuth, email verification
- **profileController.js** - User profiles, resume upload, skill extraction

#### Jobs & Applications
- **jobsController.js** - Job CRUD, semantic search, job matching
- **applicationsController.js** - Apply, track, withdraw applications

#### Messaging
- **messagesController.js** - User-to-employer messaging
- **employerMessagingController.js** - Employer-to-applicant messaging

#### Company & RAG
- **companyController.js** - Company profiles and management
- **ragChatController.js** - RAG chatbot API with feedback system

### Services (Business Logic)

#### RAG System (Self-Improving!)
1. **embeddingService.js** - Converts text to 768-dimensional vectors using Gemini
2. **vectorStoreService.js** - Manages ChromaDB storage and retrieval
3. **documentIngestionService.js** - Processes and chunks documents (500 chars, 50% overlap)
4. **ragService.js** - RAG core logic with adaptive retrieval and query expansion
5. **feedbackAnalyzer.js** - Analyzes user feedback, triggers alerts, generates reports

### Routes (API Endpoints)
- **chatRoutes.js** - Basic chat routes
- **ragChatRoutes.js** - RAG chat routes (`/api/rag-chat`, `/api/rag-chat/feedback`)
- **companyRoutes.js** - Company profile routes

### Scripts (CLI Tools)

```bash
# Ingest documentation into vector database
npm run ingest:docs

# Clear vector database
npm run clear-vector-store

# Generate feedback report (last 7 days)
npm run feedback-report

# Generate feedback report (custom period)
node scripts/feedback-report.js 30  # Last 30 days
```

### Documentation

#### For Users
- **user-guides/** - How to use NextStep (5 guides)
- **faq.md** - Frequently asked questions (50+ Q&A)

#### For Employers
- **employer-guides/** - How to hire on NextStep (2 guides)

#### For Developers
- **QUICK_START.md** - Get up and running quickly
- **PROJECT_STRUCTURE.md** - This file
- **RAG_SYSTEM_GUIDE.md** - Technical RAG documentation
- **SELF_IMPROVING_RAG.md** - How the chatbot learns from feedback
- **IMPROVEMENTS_COMPLETED.md** - Recent features and enhancements
- **RAG_IMPROVEMENTS.md** - Future improvement roadmap

#### Setup Guides
- **CHROMADB_SETUP.md** - Vector database setup
- **DOCKER_SETUP.md** - Containerization guide
- **AWS_DEPLOYMENT.md** - Production deployment
- **INGESTION_GUIDE.md** - Document ingestion details

---

## Database Collections

### MongoDB (db2)
- **users** - User accounts, profiles, skills, resumes
- **Jobs** - Job postings with embeddings for semantic search
- **applications** - Job applications with status tracking
- **companies** - Company profiles and information
- **messages** - User-employer messaging
- **rag_feedback** - Chatbot feedback (👍/👎) for self-improvement

### ChromaDB (nextstep_docs)
- **Document chunks** - Embedded documentation (768-dimensional vectors)
- **Metadata** - Source file, chunk index, document type
- **Current count** - 256 chunks from 21 documentation files

---

## API Endpoints

### Authentication
- `POST /api/signup` - Create account
- `POST /api/signin` - Login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/verify-email` - Email verification
- `POST /api/resend-verification` - Resend verification email

### Jobs
- `GET /api/jobs` - Browse jobs (with semantic search)
- `GET /api/jobs/:jobId` - Get job details
- `POST /api/jobs` - Create job (employers only)
- `PUT /api/employer/jobs/:jobId` - Update job
- `DELETE /api/employer/jobs/:jobId` - Delete job
- `GET /api/employer/jobs/search` - Search employer's jobs
- `GET /api/retrieveJobsForHomepage` - Personalized job recommendations

### Applications
- `POST /api/jobsTracker` - Apply to job
- `GET /api/applications` - Get user's applications
- `DELETE /api/applications/:applicationId` - Withdraw application
- `GET /api/employer/applications` - Get applications for employer's jobs
- `PUT /api/employer/applications/:applicationId` - Update application status

### Profile
- `GET /api/profile` - Get user profile
- `POST /api/updateprofile` - Update profile (with resume upload)
- `POST /api/analyze-resume` - AI resume analysis

### Messaging
- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message
- `POST /api/messages/company` - Send message to company
- `PUT /api/messages/read/:contactId` - Mark messages as read

### RAG Chatbot
- `POST /api/rag-chat` - Send message to chatbot
- `POST /api/rag-chat/feedback` - Submit feedback (👍/👎)
- `GET /api/rag-chat/status` - Check RAG service status

### Company
- `GET /api/companyProfile` - Get company profile
- `PUT /api/companyProfile` - Update company profile

---

## Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...
NODE_ENV=production

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id

# AI Services
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# RAG Configuration
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
RAG_COLLECTION_NAME=nextstep_docs
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50
RAG_RETRIEVAL_COUNT=4
RAG_SIMILARITY_THRESHOLD=0.3
RAG_MAX_HISTORY=5

# Email
MJ_API_KEY=your-mailjet-key
MJ_PRIVATE_KEY=your-mailjet-private-key
EMAIL_FROM=noreply@nextstep.com
SERVER_DOMAIN=http://localhost:4000

# Content Moderation
BAD_WORDS_API_KEY=your-api-key
```

---

## Recent Features

### Self-Improving RAG System ✨
- **Adaptive Retrieval** - Automatically adjusts strategy for queries with negative feedback
- **Query Expansion** - Expands queries with synonyms for better results
- **Automatic Alerts** - Warns when queries need better documentation
- **Feedback Reports** - Generate analytics on chatbot performance
- **Real-time Learning** - System improves with every user interaction

### Application Management
- **Withdraw Feature** - Users can withdraw job applications
- **Status Tracking** - Pending, Interviewing, Offered, Rejected
- **Email Notifications** - Automatic emails on status changes

### Documentation
- **21 Documentation Files** - Comprehensive guides for users, employers, and developers
- **5 User Guides** - Step-by-step instructions for all features
- **2 Employer Guides** - How to post jobs and review applications
- **FAQ** - 50+ frequently asked questions

---

## Quick Commands

```bash
# Development
npm start              # Start server with nodemon
npm run dev            # Same as start
npm test               # Run tests
npm run test:coverage  # Run tests with coverage

# Documentation
npm run docs           # Generate JSDoc

# RAG System
npm run ingest:docs              # Ingest documentation
npm run clear-vector-store       # Clear vector database
npm run feedback-report          # View feedback analytics
node scripts/feedback-report.js 30  # Last 30 days

# Production
NODE_ENV=production npm start    # Production mode
```

---

## Data Flow Examples

### Job Search with Semantic Search
```
User → BrowseJobs.jsx → /api/jobs?q="remote developer"
→ jobsController.js → parseSearchCriteria (AI)
→ generateEmbeddings → MongoDB Vector Search
→ refineFoundPositions (AI) → Results → User
```

### RAG Chat with Self-Improvement
```
User → ChatWidget.js → /api/rag-chat
→ ragChatController.js → ragService.js
→ Check feedback history (feedbackAnalyzer)
→ Adaptive retrieval (enhanced if needed)
→ vectorStoreService.js → ChromaDB
→ Gemini AI → Response + Sources → User
→ User clicks 👍/👎 → /api/rag-chat/feedback
→ feedbackAnalyzer.js → Alerts if needed
→ System learns for next time
```

### Application Withdrawal
```
User → YourJobs.js → Click "Withdraw"
→ Confirmation dialog → /api/applications/:id (DELETE)
→ applicationsController.js → MongoDB
→ Application deleted → Success message
```

---

## Testing

Tests are located in `tests/` directory:
- Unit tests for services
- Integration tests for RAG pipeline
- API endpoint tests
- Gemini API tests

Run tests:
```bash
npm test                # All tests
npm run test:coverage   # With coverage report
```

---

## Learn More

- **[Main README](../README.md)** - Project overview
- **[Quick Start](./QUICK_START.md)** - Setup guide
- **[RAG System Guide](./RAG_SYSTEM_GUIDE.md)** - Technical RAG docs
- **[Self-Improving RAG](./SELF_IMPROVING_RAG.md)** - How the chatbot learns

---

**Last Updated:** December 2024
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
