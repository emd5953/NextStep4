# NextStep - AI-Powered Job Matching Platform

<img src="src/assets/NextStep_Logo.png">

NextStep is an **AI-powered job-matching platform** designed to simplify the job search process using a **swipe-based** interface, **semantic search**, and **intelligent recommendations**. It leverages **vector embeddings**, **resume analysis**, and **real-time tracking** to connect job seekers with employers efficiently.

###  Table of Contents
- [Overview](#overview)
- [Core Features](#core-features)
- [AI Capabilities](#ai-capabilities)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
---

### Overview 

**NextStep** is an intelligent job-matching application with a **swipe-based** interface that helps job seekers efficiently browse and apply for jobs. The platform uses **AI-powered semantic search** to match candidates with relevant opportunities based on their skills, experience, and preferences. Employers can post job listings, track applications, and connect with candidates in real time.

### **Core Features** 
- **Swipe-Based Job Discovery** – Browse jobs with an intuitive swipe/scroll experience inspired by popular apps
- **AI-Powered Semantic Search** – Find jobs using natural language queries with vector similarity matching
- **Intelligent Job Recommendations** – Personalized job suggestions based on your profile using cached embeddings
- **AI Resume Analysis** – Automatic skill extraction and job title recommendations from uploaded resumes
- **One-Click Apply** – Apply instantly with stored profile and resume
- **Real-Time Application Tracking** – Monitor job application statuses and updates
- **Real Job Listings** – Jobs sourced from JSearch API (real job boards)
- **Email Verification** – Secure account verification system
- **Google OAuth** – Quick sign-in with Google accounts
- **RAG-Powered AI Chatbot** – Interactive help system with document knowledge base and feedback learning

---

### **AI Capabilities**

NextStep leverages multiple AI technologies to enhance the job matching experience:

#### **Semantic Job Search**
- **Vector Embeddings**: Jobs and user profiles are converted to 1536-dimensional vectors using OpenAI's `text-embedding-3-small` model
- **MongoDB Atlas Vector Search**: Efficient similarity search across thousands of job postings
- **Natural Language Queries**: Search using phrases like "remote software engineer with Python experience in NYC"
- **Intelligent Query Parsing**: AI extracts locations, salary ranges, skills, and requirements from search text
- **Match Refinement**: GPT-4o-mini analyzes and ranks results as "poor/good/great" matches with explanations

#### **Resume Intelligence**
- **Automated Resume Analysis**: OpenAI Assistants API with file search extracts skills and experience
- **Skill Extraction**: Identifies technical and soft skills from resume content
- **Job Title Recommendations**: Suggests appropriate job titles based on experience
- **Profile Auto-Population**: Automatically fills profile fields from resume data

#### **Personalized Recommendations**
- **Cached User Embeddings**: User skills and preferences are embedded once and cached for fast recommendations
- **Homepage Job Matching**: AI-powered job feed tailored to each user's profile
- **Score-Based Filtering**: Only shows jobs with similarity scores above 0.62 threshold
- **Performance Optimized**: No repeated API calls - embeddings cached in user profiles

#### **RAG-Powered AI Chat Assistant**
- **Google Gemini Integration**: Powered by Gemini 2.5 Flash for fast, accurate responses
- **ChromaDB Vector Store**: Document embeddings for accurate knowledge retrieval
- **Context-Aware**: Retrieves relevant documentation to answer questions
- **Self-Improving**: Learns from user feedback (👍/👎) to improve responses
- **Source Citations**: Shows which documents were used to generate answers
- **Markdown Support**: Rich formatted responses for better readability

---

### **Technology Stack** 

#### **Frontend**
- **Framework**: React.js (Web) / React Native (Mobile - planned)
- **Styling**: Custom CSS
- **React Router** – Frontend navigation
- **Axios** – API communication
- **React Markdown** – Formatted chat responses
- **React Icons** – UI iconography

#### **Backend**
- **Node.js** – Server-side runtime
- **Express.js** – Web framework and middleware
- **MongoDB Atlas** – Cloud NoSQL database with vector search capabilities
- **JWT (JSON Web Tokens)** – Secure authentication
- **Bcrypt** – Password hashing
- **Multer** – File upload handling
- **Jest** – Unit testing framework
- **JSDoc** – Code documentation

#### **AI & Machine Learning**
- **OpenAI API** – Resume analysis, embeddings, and query parsing
  - `text-embedding-3-small` – Vector embeddings (1536 dimensions)
  - `gpt-4o-mini` – Query parsing and match analysis
  - Assistants API with file search – Resume processing
- **Google Gemini** – RAG chat assistant
  - `gemini-2.5-flash` – Fast conversational AI with document retrieval
  - `text-embedding-004` – Document embeddings for RAG
- **ChromaDB** – Vector database for RAG document storage
- **LangChain** – RAG orchestration and document processing
- **MongoDB Vector Search** – Semantic similarity search with approximate nearest neighbor

#### **Email & Authentication**
- **Mailjet** – Transactional email service
- **Google OAuth 2.0** – Social authentication
- **Crypto** – Token generation for email verification

#### **DevOps & Deployment**
- **Docker** – ChromaDB containerization
- **Nodemon** – Development server with hot reload
- **dotenv** – Environment variable management
- **CORS** – Cross-origin resource sharing
- Deployment platform: TBD

---

### **Installation** 
```bash
# 1 Clone the Repository
git clone https://github.com/drewstake/nextstep.git
cd nextstep

# 2 Install Backend Dependencies
cd server
npm install

# 3 Run server unit tests (you must be in server folder)
cd server
npm test
# Run unit tests with code coverage report (you must be in server folder)
npm run test:coverage 

# 4 Install Frontend Dependencies
cd ../src
npm install

# 5 Regenerate jsdocs (currently available only for server-side API code but must be run from the NextStep root folder where the README.md file is located)
# Notice: JSdoc is a global install. Hence, must be installed separately.
npm install -g jsdoc
jsdoc -c jsdoc.json
```

---

### **Configuration**
Before running the app, configure the environment variables.

#### Frontend .env File
```bash
REACT_APP_BACKEND_URL=http://localhost:4000
```

#### Backend .env File (server/.env)
```bash
# Server Configuration
PORT=4000
NODE_ENV=development
SERVER_DOMAIN=http://localhost:4000

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nextstep

# Authentication
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# AI Services
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_google_gemini_api_key

# RAG Chatbot Configuration
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50
RAG_RETRIEVAL_COUNT=4
RAG_EMBEDDING_MODEL=text-embedding-004
RAG_GENERATION_MODEL=gemini-2.5-flash
RAG_MAX_HISTORY=5
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
RAG_COLLECTION_NAME=nextstep_docs
RAG_SIMILARITY_THRESHOLD=0.3

# JSearch API (Real Jobs)
JSEARCH_API_KEY=your_jsearch_api_key

# Email Service (Mailjet)
MJ_API_KEY=your_mailjet_api_key
MJ_PRIVATE_KEY=your_mailjet_private_key
EMAIL_FROM=noreply@nextstep.com

# Optional Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
BAD_WORDS_API_KEY=your_content_filter_api_key
```

**Note**: MongoDB Atlas must have vector search index configured:
- Index name: `js_vector_index`
- Path: `embedding`
- Dimensions: 1536
- Similarity: cosine

---

### **Running The Application**
```bash
# 1 Start ChromaDB (for RAG chatbot)
cd docker
docker-compose up -d

# 2 Ingest Documentation (first time only)
cd ../server
npm run ingest:docs

# 3 Start Backend
npm start
# Server will run on http://localhost:5000

# 4 Start Frontend
cd ..
npm start
# Frontend will run on http://localhost:3000
```

---

### **API Endpoints**

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/signup | Register new user with email verification |
| POST | /api/signin | Authenticate user (email/password) |
| POST | /api/auth/google | Google OAuth authentication |
| GET | /api/auth/verify-email | Verify email address |
| POST | /api/resend-verification | Resend verification email |
| GET | /api/logout | Logout current user |

#### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/jobs | Browse all jobs with optional search (semantic or keyword) |
| GET | /api/jobs/:jobId | Get single job details |
| GET | /api/newJobs | Get jobs user hasn't applied to (requires auth) |
| GET | /api/retrieveJobsForHomepage | AI-powered personalized job recommendations |

#### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/jobsTracker | Track job application (apply/skip/ignore) |
| GET | /api/applications | Get user's applications with status |
| DELETE | /api/applications/:applicationId | Withdraw application |
| POST | /api/auto-apply | Auto-apply to job |
| POST | /api/reject-job | Reject/ignore job |
| GET | /api/rejected-jobs | Get rejected jobs |
| GET | /api/getallappl | Get all applications (admin) |

#### Profile & Resume
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/profile | Get current user's profile |
| POST | /api/updateprofile | Update profile with photo/resume upload |
| POST | /api/analyze-resume | AI-powered resume analysis (extracts skills) |
| GET | /api/userProfile/:userId | Get public user profile |
| GET | /api/users | Get all users (for messaging) |

#### RAG AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/rag-chat | Send message to RAG chatbot, get response with sources |
| POST | /api/rag-chat/feedback | Submit feedback (👍/👎) for chatbot response |
| GET | /api/rag-chat/status | Check RAG service status and document count |

---

### **Documentation**

📚 **All documentation is in [`server/docs/`](./server/docs/)** - This is what the RAG chatbot uses!

#### For Users
- **[FAQ](./server/docs/faq.md)** - Frequently asked questions
- **[Complete Feature Guide](./server/docs/user-guides/complete-feature-guide.md)** - Full platform guide
- **[User Guides](./server/docs/user-guides/)** - How to use NextStep
  - [How to Apply to Jobs](./server/docs/user-guides/how-to-apply-jobs.md)
  - [How to Withdraw Application](./server/docs/user-guides/how-to-withdraw-application.md)
  - [How to Create Profile](./server/docs/user-guides/how-to-create-profile.md)
  - [How to Search Jobs](./server/docs/user-guides/how-to-search-jobs.md)
  - [How to Check Progress](./server/docs/user-guides/how-to-check-progress.md)

#### 🤖 RAG Chatbot
- **[Self-Improving RAG System](./server/docs/SELF_IMPROVING_RAG.md)** ⭐ - How the chatbot learns from feedback
- **[RAG System Guide](./server/docs/RAG_SYSTEM_GUIDE.md)** - Technical documentation
- **[RAG Improvements Roadmap](./server/docs/RAG_IMPROVEMENTS.md)** - Future enhancements
- **[Ingestion Guide](./server/docs/INGESTION_GUIDE.md)** - How to add/update documentation
- **[Recent Improvements](./server/docs/IMPROVEMENTS_COMPLETED.md)** - Latest features

#### For Developers
- **[Quick Start Guide](./server/docs/QUICK_START.md)** - Get up and running
- **[Project Structure](./server/docs/PROJECT_STRUCTURE.md)** - Codebase organization
- **[Docker Setup](./server/docs/DOCKER_SETUP.md)** - Containerization
- **[ChromaDB Setup](./server/docs/CHROMADB_SETUP.md)** - Vector database
- **[AWS Deployment](./server/docs/AWS_DEPLOYMENT.md)** - Production deployment
- **[Server README](./server/README.md)** - Backend documentation

#### Migration & Cleanup
- **[Employer Removal Migration](./docs/EMPLOYER_REMOVAL_MIGRATION.md)** - Employer feature deprecation (Jan 2026)
- **[Final Cleanup Summary](./docs/FINAL_CLEANUP_SUMMARY.md)** - Platform simplification
- **[Migration Guide](./docs/MIGRATION_GUIDE.md)** - Database migration guide
- **[Real Jobs Setup](./docs/REAL_JOBS_SETUP.md)** - JSearch API integration

#### Reference
- **[System Diagrams](./docs/all-diagrams-source-files/)** - Architecture diagrams

---

### **Contributing**
We welcome contributions! Follow these steps:

- Fork the repository 
- Create a new branch (feature/your-feature-name)
- Commit your changes
- Push to your fork
- Submit a pull request

---

### **License**
This project is licensed under the MIT License.

---

### **Future Enhancements**
- Enhanced real-time notifications
- Mobile app (React Native)
- Advanced analytics dashboard
- Job alerts and saved searches

