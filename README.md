# 🚀 Codebase Intelligence Platform

**AI-Powered RAG System for Intelligent Code Analysis**

A production-ready, locally-running AI platform with LangChain RAG that lets you clone code repositories, generate embeddings locally, and ask questions about your codebase using local LLM inference with Ollama.

> **Repository:** https://github.com/chinmayakumarbiswal/codebase-intelligence-platform

## Features

✅ **OAuth2 Authentication** - GitHub OAuth login with JWT  
✅ **Multi-Project Support** - Manage multiple repositories with project isolation  
✅ **LangChain RAG Pipeline** - Production-ready retrieval-augmented generation  
✅ **Local Embeddings** - Ollama with nomic-embed-text (768-dimensional vectors)  
✅ **Vector Search** - Chroma vector database for semantic similarity  
✅ **Local LLM Inference** - Ollama with tinyllama (no external API calls)  
✅ **Intelligent Chat** - Ask questions with automatic source code citations  
✅ **Smart Code Indexing** - Automatic chunking (2000 chars, 50 char overlap)  
✅ **Real-time Progress** - Live tracking of indexing with 500ms updates  
✅ **20+ Languages Supported** - JavaScript, Python, Java, Go, Rust, C++, etc.  
✅ **Docker Ready** - Complete Docker Compose setup for all services  

## Tech Stack

### Frontend
- **React 18** + **Vite** bundler
- **Material-UI (MUI)** components
- **React Router v6** for navigation
- **Zustand** state management
- **Axios** HTTP client (300-second timeout)

### Backend
- **Node.js 22+** with **Express.js**
- **LangChain 1.4.4+** for RAG orchestration
- **JWT + OAuth2** authentication
- **MySQL 8** for persistent data storage

### AI/ML & Data
- **Ollama** - Local LLM inference (tinyllama 1B params)
- **Chroma** - Vector store for embeddings (HTTP API)
- **nomic-embed-text** - 768D embedding model (137M params)
- **RecursiveCharacterTextSplitter** - Intelligent code chunking

### Infrastructure
- **Docker & Docker Compose** - 5-container setup
- **MySQL 8** - User, project, conversation storage
- **Chroma HTTP** - Vector database (Port 8000)
- **Ollama** - LLM server (Port 11434)

## Quick Start (5 Minutes)

### System Requirements

- Docker 4.0+ and Docker Compose 2.0+
- 8GB RAM minimum (16GB recommended)
- 15GB free disk space
- Ports 3000, 3001, 3306, 8000, 11434 available

### 1. Clone Repository

```bash
git clone https://github.com/chinmayakumarbiswal/codebase-intelligence-platform.git
cd codebase-intelligence-platform
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with required values
# Required: MYSQL_PASSWORD, JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
nano .env  # or use your preferred editor
```

### 3. Start Services

```bash
cd docker
docker-compose down        # Stop any existing services
docker-compose up --build -d  # Start all 5 containers

# Wait 30-60 seconds for initialization
docker ps                  # Verify all containers running
```

### 4. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Documentation Portal:** [docs/index.html](docs/index.html)

### 5. First Use

1. Click "Login" → Authenticate with GitHub
2. Click "+ Clone Project" → Enter repository URL
3. Wait for indexing to complete (progress shown in real-time)
4. Click "Open Chat" → Start asking questions about the codebase

---

## 📚 Complete Documentation

All documentation is available in the `docs/` folder and via the **interactive HTML portal**:

### Documentation Files

| File | Purpose |
|------|---------|
| [docs/index.html](docs/index.html) | **Interactive Documentation Portal** (Start here!) |
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Project features and use cases |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and data flow |
| [docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md) | Database schema with ERD |
| [docs/MICROSERVICES_ARCHITECTURE.md](docs/MICROSERVICES_ARCHITECTURE.md) | Container setup and networking |
| [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | Detailed setup and deployment (Windows, Linux) |

### Quick Links

- 🔗 **HTML Portal** - Open [docs/index.html](docs/index.html) for interactive documentation
- 📋 **API Reference** - Complete 20+ endpoint documentation in SETUP_GUIDE.md
- 🏗️ **Architecture** - System design and component overview
- 🐳 **Docker Setup** - Container orchestration details
- 🔑 **API Endpoints** - All 20+ endpoints documented with examples

---

## Project Structure

```
study-project/
├── frontend/                 # React application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API client
│   │   ├── hooks/           # Custom hooks
│   │   ├── auth/            # Auth logic
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Node.js Express application
│   ├── src/
│   │   ├── auth/            # OAuth & JWT
│   │   ├── projects/        # Project management
│   │   ├── parser/          # Code parsing
│   │   ├── embeddings/      # Ollama integration
│   │   ├── rag/             # RAG pipeline
│   │   ├── chat/            # Chat endpoints
│   │   ├── analysis/        # Code analysis
│   │   ├── database/        # MySQL
│   │   └── middleware/      # Express middleware
│   ├── package.json
│   └── tsconfig.json
├── docker/
│   ├── docker-compose.yml   # Service orchestration
│   ├── Dockerfile.backend   # Backend image
│   ├── Dockerfile.frontend  # Frontend image
│   └── .dockerignore
└── docs/                     # Documentation

```

## Development

### Backend Development

```bash
cd backend
npm install
npm run dev

# In another terminal
npm run lint
npm test
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev

# In another terminal
npm run lint
npm test
```

## API Reference (20+ Endpoints)

**Base URL:** `http://localhost:3001/api`  
**Authentication:** JWT Bearer token in Authorization header

### 1. Authentication (5 endpoints)

```
POST   /auth/login                 - Login with email/password
POST   /auth/github                - GitHub OAuth redirect
GET    /auth/callback              - OAuth callback handler
GET    /auth/profile               - Get current user (requires auth)
POST   /auth/logout                - Logout user
```

### 2. Projects (5 endpoints)

```
POST   /projects/clone             - Clone Git repository
GET    /projects                   - List all projects
GET    /projects/:projectId        - Get project details
PUT    /projects/:projectId        - Update project
DELETE /projects/:projectId        - Delete project
```

### 3. Chat (5 endpoints)

```
POST   /chat/conversation          - Start new chat
GET    /chat/conversations/:projectId - List conversations
GET    /chat/history/:conversationId  - Get message history
POST   /chat/message               - Send message
DELETE /chat/conversations/:conversationId - Delete conversation
```

### 4. Search & Code (3 endpoints)

```
POST   /chat/search-chunks         - Semantic search in code
GET    /chat/chunks/:projectId     - Get all code chunks
GET    /chat/progress/:projectId   - Get indexing progress (no auth)
```

### 5. Embeddings (2 endpoints)

```
GET    /embeddings/:projectId      - Get embedding stats
POST   /embeddings/search          - Advanced vector search
```

📖 **Complete API Documentation:** See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for all endpoint details with request/response examples.

---

## Project Status

| Component | Status | Details |
|-----------|--------|---------|
| **Core Features** | ✅ COMPLETE | RAG pipeline, indexing, chat, embeddings |
| **Docker Setup** | ✅ COMPLETE | 5-container orchestration (frontend, backend, mysql, chroma, ollama) |
| **Authentication** | ✅ COMPLETE | GitHub OAuth2 with JWT tokens |
| **API** | ✅ COMPLETE | 20+ endpoints fully functional |
| **Chat UI** | ✅ COMPLETE | Real-time messaging with source citations |
| **Documentation** | ✅ COMPLETE | HTML portal + 5 markdown files |
| **Production Ready** | ✅ YES | Suitable for Windows/Linux deployment |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **Total Endpoints** | 20+ |
| **Supported Languages** | 20+ (JS, TS, Python, Java, Go, Rust, C++, etc.) |
| **Embedding Dimension** | 768 (nomic-embed-text) |
| **Chunk Size** | 2000 characters with 50 char overlap |
| **Container Services** | 5 (frontend, backend, mysql, chroma, ollama) |
| **Response Timeout** | 300 seconds (5 minutes) |
| **Max Project Size** | 10GB+ (disk dependent) |

---

## Project Structure

```
codebase-intelligence-platform/
├── frontend/                    # React 18 + Vite + MUI
│   ├── src/
│   │   ├── pages/              # ChatPage, ProjectsPage, etc.
│   │   ├── components/         # AppHeader, ChatInterface, etc.
│   │   ├── services/           # API client (axios)
│   │   └── App.jsx             # Router configuration
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Express.js + LangChain
│   ├── src/
│   │   ├── auth/               # OAuth2 + JWT
│   │   ├── projects/           # Project management
│   │   ├── chat/               # Chat routes & RAG
│   │   ├── rag/                # LangChain RAG service
│   │   ├── database/           # MySQL connections
│   │   └── middleware/         # Auth, error handling
│   ├── package.json
│   └── server.js
│
├── docker/                      # Container orchestration
│   ├── docker-compose.yml      # 5-service setup
│   ├── Dockerfile.frontend     # React build image
│   ├── Dockerfile.backend      # Node.js app image
│   └── .dockerignore
│
├── docs/                        # Comprehensive documentation
│   ├── index.html              # Interactive portal
│   ├── PROJECT_OVERVIEW.md     # Features & use cases
│   ├── ARCHITECTURE.md         # System design
│   ├── DATABASE_ARCHITECTURE.md # Database schema + ERD
│   ├── MICROSERVICES_ARCHITECTURE.md # Containers & networking
│   └── SETUP_GUIDE.md          # Setup & deployment
│
├── .env.example                 # Environment template
├── README.md                    # This file
└── .gitignore
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Port already in use** | Change port in docker-compose.yml or kill existing process |
| **MySQL connection failed** | Check credentials in .env, ensure MySQL container is healthy |
| **Chroma connection error** | Verify `http://localhost:8000/api/v1/heartbeat` responds |
| **Ollama models not found** | Run `docker exec codebase_ollama ollama pull tinyllama` |
| **Out of disk space** | Check with `docker system df`, clean up with `docker system prune` |
| **Slow response times** | Check container logs: `docker logs codebase_backend -f` |
| **Chat not working** | Verify JWT token in browser console, restart backend |

### Docker Commands

```bash
# View container status
docker ps

# View service logs
docker logs codebase_backend -f    # Backend logs
docker logs codebase_mysql         # MySQL logs
docker logs codebase_chroma        # Chroma logs
docker logs codebase_ollama        # Ollama logs

# Restart services
docker-compose restart backend
docker-compose restart mysql

# Full reset
docker-compose down -v
docker-compose up --build -d
```

### Health Checks

```bash
# Frontend health
curl http://localhost:3000

# Backend API health
curl http://localhost:3001/api/health

# MySQL health
mysql -h 127.0.0.1 -u codebase_user -p -e "SELECT 1"

# Chroma health
curl http://localhost:8000/api/v1/heartbeat

# Ollama health
curl http://localhost:11434/api/tags
```

---

## Development

### Local Development Setup

```bash
# Frontend development (hot reload)
cd frontend
npm install
npm run dev         # Runs on http://localhost:5173

# Backend development (in another terminal)
cd backend
npm install
npm run dev         # Runs on http://localhost:3001
```

### Contributing

1. Clone the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m "Description of changes"`
6. Push: `git push origin feature/your-feature`
7. Create Pull Request

---

## Performance Tuning

### Increasing LLM Performance

```bash
# Increase parallel requests (in .env or docker-compose)
OLLAMA_NUM_PARALLEL=4
OLLAMA_NUM_GPU=1          # If GPU available
```

### Increasing Database Performance

```bash
# MySQL optimizations
MYSQL_MAX_CONNECTIONS=1000
MYSQL_INNODB_BUFFER_POOL_SIZE=1G
```

### Increasing Chroma Performance

```bash
# Vector search optimization
CHROMA_QUERY_MAX_SIZE=10000
CHROMA_BATCH_SIZE=1000
```

---

## License

MIT - See LICENSE file for details

---

## Support & Resources

- 📖 **Documentation Portal:** [docs/index.html](docs/index.html)
- 📘 **Setup Guide:** [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
- 🏗️ **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 🗄️ **Database Schema:** [docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md)
- 🐳 **Container Setup:** [docs/MICROSERVICES_ARCHITECTURE.md](docs/MICROSERVICES_ARCHITECTURE.md)
- 🔗 **GitHub Repository:** https://github.com/chinmayakumarbiswal/codebase-intelligence-platform

---

## Roadmap

### Phase 1: ✅ COMPLETE
- Infrastructure & authentication
- Docker Compose setup
- GitHub OAuth2

### Phase 2: ✅ COMPLETE
- Project management
- Git repository cloning
- File indexing

### Phase 3: ✅ COMPLETE
- Code embeddings
- Vector search
- Chroma integration

### Phase 4: ✅ COMPLETE
- RAG chat interface
- LangChain integration
- Source citations

### Phase 5: 🟡 PLANNED
- Code analysis features
- Security scanning
- Dependency analysis

### Phase 6: 🟡 PLANNED
- Team collaboration
- API documentation generation
- Performance optimization

---

## Acknowledgments

Built with:
- [LangChain](https://js.langchain.com/) - RAG orchestration
- [Ollama](https://ollama.ai/) - Local LLM inference
- [Chroma](https://www.trychroma.com/) - Vector database
- [React](https://react.dev/) - Frontend framework
- [Express.js](https://expressjs.com/) - Backend framework
- [Docker](https://www.docker.com/) - Containerization

---

**Last Updated:** June 10, 2026
