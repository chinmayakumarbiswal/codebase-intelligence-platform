# System Architecture

## Overview

Codebase Intelligence uses a **three-tier architecture** with **microservices** for scalability and separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Frontend (Port 3000)                          │  │
│  │  - Chat Interface                                    │  │
│  │  - Project Management                               │  │
│  │  - Embeddings Browser                               │  │
│  │  - Real-time Progress                               │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │ REST API (HTTP)
                   │ Timeout: 5 minutes
┌──────────────────▼──────────────────────────────────────────┐
│               APPLICATION LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express Backend (Port 3001)                         │  │
│  │  ┌─────────────┐ ┌──────────────┐                   │  │
│  │  │ Auth Layer  │ │ Chat Routes  │                   │  │
│  │  │ - JWT       │ │ - Query      │                   │  │
│  │  │ - OAuth2    │ │ - History    │                   │  │
│  │  └─────────────┘ └──────────────┘                   │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │      RAG Service (LangChain)                 │   │  │
│  │  │  - Query Orchestration                       │   │  │
│  │  │  - Retrieval & Reranking                     │   │  │
│  │  │  - Context Aggregation                       │   │  │
│  │  │  - Generation                                │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                      │  │
│  │  ┌─────────────┐ ┌──────────────┐                   │  │
│  │  │ Chunking    │ │ Embeddings   │                   │  │
│  │  │ - File read │ │ - nomic-text │                   │  │
│  │  │ - Splitting │ │ - 768D vec   │                   │  │
│  │  └─────────────┘ └──────────────┘                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────┬──────────────┬──────────────────┬────────────────────┘
     │              │                  │
     ▼              ▼                  ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│   MySQL     │ │   Chroma     │ │   Ollama     │
│   (Port     │ │   HTTP API   │ │   (Port      │
│   3306)     │ │   (Port 8000)│ │   11434)     │
└─────────────┘ └──────────────┘ └──────────────┘
```

## Component Details

### 1. Frontend Layer (React + Vite)

**Responsibilities:**
- User interface and interaction
- Real-time progress tracking
- Session management
- Embeddings visualization

**Key Components:**
- `App.jsx` - Router configuration
- `pages/ChatPage.jsx` - Main chat interface
- `pages/ProjectsPage.jsx` - Project listing
- `pages/EmbeddingsPage.jsx` - Chunk browser
- `components/Chat.jsx` - Chat UI with message history
- `components/IndexingProgress.jsx` - Real-time indexing progress

**State Management:**
- Zustand for authentication (JWT token, user info)
- React hooks for component state
- LocalStorage for session persistence

### 2. Backend Layer (Express.js + LangChain)

**Core Modules:**

#### Authentication Module
- **File:** `backend/src/auth/routes.js`
- **Features:**
  - OAuth2 integration for GitHub/Google
  - JWT token generation and validation
  - Token refresh mechanism
  - User session management

#### Project Management Module
- **File:** `backend/src/projects/routes.js`
- **Features:**
  - Git repository cloning
  - Project CRUD operations
  - Storage path management
  - Indexing trigger

#### RAG Service (LangChain Integration)
- **File:** `backend/src/rag/rag-service-langchain.js`
- **Architecture:**
  ```
  Query Input
      ↓
  [Retrieve Similar Chunks] ← Chroma Vector Store
      ↓
  [Rerank Results]
      ↓
  [Create Context Window]
      ↓
  [Send to LLM] → Ollama (tinyllama)
      ↓
  Response Generation
      ↓
  Return with Source Chunks
  ```

#### Chat Routes
- **File:** `backend/src/chat/routes-v2.js`
- **Endpoints:**
  - `POST /api/chat/conversation` - Start new conversation
  - `GET /api/chat/history/:conversationId` - Load message history
  - `POST /api/chat/search-chunks` - Semantic search
  - `GET /api/chat/chunks/:projectId` - Browse indexed chunks
  - `GET /api/chat/progress/:projectId` - Real-time indexing progress

### 3. Data Layer

#### MySQL Database
- **Role:** Persistent data storage
- **Tables:**
  - `users` - User accounts and profiles
  - `projects` - Repository metadata
  - `conversations` - Chat sessions
  - `messages` - Chat history with source chunks
  - `chunks` - Indexed code chunks metadata
  - `embeddings` - Embedding metadata

#### Chroma Vector Store
- **Role:** Vector similarity search
- **Interface:** HTTP API (Port 8000)
- **Collection:** `codebase_documents`
- **Features:**
  - 768-dimensional vectors (nomic-embed-text)
  - Metadata filtering
  - Similarity search (cosine distance)

#### Ollama LLM Server
- **Role:** Local inference engine
- **Models:**
  - Chat: `tinyllama` (1B parameters)
  - Embeddings: `nomic-embed-text` (137M parameters)
- **Interface:** HTTP API (Port 11434)
- **Performance:** 30-90s inference for large context

## Request Flow - Chat Query

```
User Query
    ↓
[Frontend: Send query with projectId, JWT]
    ↓
Backend receives: POST /api/chat/...
    ↓
[Middleware: Validate JWT]
    ↓
[RAG Service: Query LLM]
    ├─→ [Retrieve: Similarity search in Chroma]
    │       └─→ [Sort by score]
    │
    ├─→ [Rerank: Select top N chunks]
    │       └─→ [Create context: ~6000 tokens]
    │
    └─→ [Generate: Send to Ollama]
            └─→ [Stream response]
    ↓
[Format response with source chunks]
    ↓
[Send back to frontend]
    ↓
[Display in chat with source attribution]
```

## Indexing Flow - New Project

```
Clone Project
    ↓
[Backend: Parse git repo]
    ↓
[Chunking: RecursiveCharacterTextSplitter]
    ├─→ Chunk size: 2000 characters
    ├─→ Chunk overlap: 50 characters
    └─→ Split by: language-specific delimiters
    ↓
[Batch Processing: 100 chunks/batch]
    ↓
[Embeddings: Send to Ollama]
    ├─→ Model: nomic-embed-text
    ├─→ Output: 768-dimensional vectors
    └─→ Rate: ~5-10 chunks/sec
    ↓
[Storage: Write to Chroma]
    ├─→ Metadata: projectId, file, line numbers
    └─→ Content: Code text + embeddings
    ↓
[Progress: Emit real-time updates]
    ├─→ File count
    ├─→ Total chunks
    └─→ Embedded count
    ↓
[Database: Store metadata in MySQL]
    ↓
[Complete: Project indexed]
```

## Security Architecture

```
┌──────────────────────────────────────┐
│     Frontend Security Layer          │
│  - HTTPS only (in production)        │
│  - JWT token in Authorization header │
│  - Token refresh mechanism           │
│  - LocalStorage encryption           │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│     Backend Security Layer           │
│  - JWT verification middleware       │
│  - User authorization checks         │
│  - SQL injection prevention          │
│  - Input validation                  │
│  - Rate limiting                     │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│     Data Security Layer              │
│  - Encrypted connection to MySQL     │
│  - User isolation per conversation   │
│  - Project-level access control      │
│  - Secure token storage              │
└──────────────────────────────────────┘
```

## Scalability Considerations

### Current Architecture
- Single backend instance
- Shared MySQL database
- Shared Chroma instance
- Single Ollama instance (inference bottleneck)

### Scaling Opportunities
1. **Horizontal Backend Scaling:**
   - Load balancer (nginx/HAProxy)
   - Multiple Express instances
   - Session sharing via Redis

2. **Database Scaling:**
   - MySQL replication (read replicas)
   - Connection pooling optimization
   - Query optimization and indexing

3. **Vector Store Scaling:**
   - Chroma clustering
   - Sharding by project ID
   - Caching layer (Redis)

4. **LLM Inference Scaling:**
   - Multiple Ollama instances with load balancing
   - Quantized models for faster inference
   - Batch inference optimization

## Error Handling & Recovery

**Chat API Resilience:**
- 5-minute timeout for inference
- Graceful degradation if Ollama unavailable
- Fallback to keyword search

**Indexing Resilience:**
- Resume interrupted indexing
- Batch transactional writes
- Duplicate detection

**Database Resilience:**
- Connection pooling and retry logic
- Transaction rollback on failure
- Health check endpoints

---

See [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) for detailed data model and [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md) for deployment details.
