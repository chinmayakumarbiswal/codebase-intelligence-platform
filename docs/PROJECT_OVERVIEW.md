# Codebase Intelligence - Project Overview

## Project Description

**Codebase Intelligence** is an advanced RAG (Retrieval-Augmented Generation) system designed to provide intelligent code analysis and conversational interaction with your codebase. It enables developers to ask natural language questions about their code and receive contextually relevant answers powered by AI.

## Key Features

### 1. **Code Indexing & Chunking**
- Automatically clones Git repositories
- Intelligent code chunking using RecursiveCharacterTextSplitter
- Supports 20+ programming languages (.js, .ts, .py, .java, .go, .rs, .cpp, .cs, etc.)
- Real-time progress tracking during indexing

### 2. **Vector Embeddings**
- Uses Ollama's `nomic-embed-text` model for semantic embeddings
- 768-dimensional vectors for high-quality similarity search
- Persistent storage in Chroma vector database

### 3. **RAG-Powered Chat**
- LangChain orchestration for RAG pipeline
- Ollama's `tinyllama` model for fast local inference
- Semantic similarity search across indexed code
- Source code retrieval for answer validation

### 4. **Embeddings Browser**
- Browse all indexed code chunks
- Real-time semantic search across chunks
- Filter and explore project structure
- Statistics on chunks and files

### 5. **Multi-Project Support**
- Clone and manage multiple projects
- Separate embeddings per project
- Project-based conversation isolation
- Concurrent indexing support

## Technology Stack

### Backend
- **Runtime:** Node.js 22
- **Framework:** Express.js
- **RAG Framework:** LangChain 1.4.4+
- **Database:** MySQL 8
- **Vector Store:** Chroma (HTTP API)
- **LLM Server:** Ollama (Local)
- **Authentication:** JWT with OAuth2

### Frontend
- **Framework:** React 18
- **UI Library:** Material-UI (MUI)
- **Build Tool:** Vite
- **State Management:** Zustand
- **Routing:** React Router v6
- **HTTP Client:** Axios with 5min timeout

### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Network:** Bridge network (codebase_network)
- **Ports:**
  - Frontend: 3000
  - Backend: 3001
  - MySQL: 3306
  - Ollama: 11434
  - Chroma: 8000

## Project Statistics

| Component | Details |
|-----------|---------|
| Code Languages Supported | 20+ |
| Average Chunk Size | 2000 characters |
| Chunk Overlap | 50 characters |
| Embedding Dimensions | 768D (nomic-embed-text) |
| LLM Model | tinyllama (1B parameters) |
| Inference Timeout | 300 seconds |
| Vector Store | Chroma HTTP |
| Database | MySQL 8 with JSON support |

## Use Cases

1. **Code Exploration:** Ask "What does this function do?" and get instant answers from your codebase
2. **Bug Investigation:** "Where is this variable used?" to trace potential issues
3. **Feature Discovery:** "How is authentication handled?" to understand system patterns
4. **Documentation Generation:** "Summarize the API endpoints" for quick reference
5. **Code Review Assistant:** "Are there any error handling issues in this module?"

## Architecture Layers

```
┌─────────────────────────────────────────┐
│         Frontend (React + MUI)          │
│  - Chat Interface                       │
│  - Project Management                   │
│  - Embeddings Browser                   │
│  - Real-time Progress Tracking          │
└──────────────┬──────────────────────────┘
               │ HTTP/REST (Axios, 5min timeout)
┌──────────────▼──────────────────────────┐
│      Backend (Express + LangChain)      │
│  - Project Management                   │
│  - Chat API                             │
│  - Embedding Search                     │
│  - Progress Tracking                    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐   ┌───▼──┐   ┌───▼──┐
│MySQL │   │Chroma│   │Ollama│
│  DB  │   │ VectorDB │ LLM  │
└──────┘   └──────┘   └──────┘
```

## Data Flow

1. **User clones a project** → Backend stores Git path in MySQL
2. **Auto-indexing starts** → Chunks code → Generates embeddings via Ollama
3. **Embeddings stored** → Persisted in Chroma vector database
4. **User asks question** → Frontend sends query to backend
5. **RAG Pipeline**:
   - Retrieve relevant chunks (similarity search)
   - Rerank and select top N
   - Generate answer with LLM
   - Return with source chunks

## Performance Characteristics

- **Indexing:** ~60-120 seconds per 1000 chunks (depending on model)
- **Similarity Search:** <100ms for 10 most relevant chunks
- **LLM Inference:** 30-90 seconds for large context (tinyllama)
- **Chat Response:** 35-100 seconds end-to-end
- **Concurrent Users:** Supports multiple parallel sessions
- **Max Chunk Count:** 10,000+ chunks per project

## Next Steps

1. See [SETUP_GUIDE.md](./SETUP_GUIDE.md) to get started
2. Review [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) for data model
3. Check [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md) for infrastructure
4. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details
