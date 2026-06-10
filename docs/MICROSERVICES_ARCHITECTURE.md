# Container & Microservices Architecture

## Overview

Codebase Intelligence uses **Docker Compose** to orchestrate 5 microservices in a containerized environment with shared networking and persistent storage.

## Container Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Host Environment                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Docker Network (bridge)                       │ │
│  │            codebase_network                                │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │  Frontend    │  │   Backend    │  │    MySQL     │     │ │
│  │  │  Container   │  │  Container   │  │  Container   │     │ │
│  │  │  :3000       │  │  :3001       │  │  :3306       │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  │                                                             │ │
│  │  ┌──────────────────────┐        ┌──────────────────────┐ │ │
│  │  │    Chroma            │        │     Ollama           │ │ │
│  │  │    Container         │        │     Container        │ │ │
│  │  │    :8000             │        │     :11434           │ │ │
│  │  │                      │        │                      │ │ │
│  │  │ Vector Store DB      │        │  Local LLM Server    │ │ │
│  │  └──────────────────────┘        └──────────────────────┘ │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Persistent Volumes                            │ │
│  │  - mysql_data (MySQL database files)                       │ │
│  │  - ollama_data (LLM model files)                           │ │
│  │  - chroma_data (Vector DB files)                           │ │
│  │  - projects_data (Cloned repositories)                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Service Specifications

### 1. Frontend Service (docker-frontend)

```dockerfile
Service: codebase_frontend
Image: node:22-slim
Port: 3000 (exposed to host)
Build: Vite (development server)

Volumes: None (stateless)
Network: codebase_network (bridge)

Environment Variables:
  - VITE_API_BASE_URL=http://backend:3001
  - NODE_ENV=production

Health Check: HTTP GET /
```

**Characteristics:**
- Stateless (can be scaled horizontally)
- Vite development server with HMR
- ~150MB image size
- CPU: Minimal (serves static files)
- Memory: ~200MB

---

### 2. Backend Service (docker-backend)

```dockerfile
Service: codebase_backend
Image: node:22-slim
Port: 3001 (exposed to host)
Build: Express server with dependencies

Volumes:
  - projects_data:/app/data/projects (R/W)

Network: codebase_network (bridge)

Environment Variables:
  - NODE_ENV=production
  - PORT=3001
  - MYSQL_HOST=mysql
  - MYSQL_USER=${MYSQL_USER}
  - MYSQL_PASSWORD=${MYSQL_PASSWORD}
  - MYSQL_DATABASE=codebase_intelligence
  - OLLAMA_BASE_URL=http://ollama:11434
  - CHROMA_HOST=http://chroma:8000
  - JWT_SECRET=${JWT_SECRET}
  - LLM_TYPE=ollama
  - EMBEDDING_MODEL=nomic-embed-text

Health Check:
  - Interval: 10s
  - Timeout: 5s
  - Retries: 5
```

**Characteristics:**
- Stateless for API calls, but accesses project data
- Performs CPU-intensive indexing
- Connects to: MySQL, Chroma, Ollama
- ~400MB image size
- CPU: High during indexing
- Memory: ~500MB average

---

### 3. MySQL Database Service (mysql)

```dockerfile
Service: codebase_mysql
Image: mysql:8
Port: 3306 (exposed to host)

Volumes:
  - mysql_data:/var/lib/mysql (persistent)

Network: codebase_network (bridge)

Environment Variables:
  - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
  - MYSQL_USER=${MYSQL_USER}
  - MYSQL_PASSWORD=${MYSQL_PASSWORD}
  - MYSQL_DATABASE=codebase_intelligence

Health Check:
  - Command: mysqladmin ping -h localhost
  - Interval: 5s
  - Timeout: 3s
  - Retries: 3
```

**Characteristics:**
- Stateful (data persisted to volume)
- Schema: 6 tables with relationships
- Data: Users, projects, conversations, messages
- ~500MB image size
- CPU: Low to moderate
- Memory: ~300MB

---

### 4. Chroma Vector Store (chroma)

```dockerfile
Service: codebase_chroma
Image: ghcr.io/chroma-core/chroma:latest
Port: 8000 (exposed to host)

Volumes:
  - chroma_data:/chroma/data (persistent)

Network: codebase_network (bridge)

Environment Variables:
  - CHROMA_DB_IMPL=duckdb+parquet
  - PERSIST_DIRECTORY=/chroma/data

Configuration:
  - Collections: 1 (codebase_documents)
  - Metadata: {projectId, fileName, lineStart, lineEnd}
```

**Characteristics:**
- Stateful (vectors persisted)
- DuckDB + Parquet for storage
- Handles similarity search queries
- ~1.2GB image size
- CPU: Moderate during search
- Memory: ~400MB

---

### 5. Ollama LLM Server (ollama)

```dockerfile
Service: codebase_ollama
Image: ollama/ollama:latest
Port: 11434 (exposed to host)

Volumes:
  - ollama_data:/root/.ollama (persistent)

Network: codebase_network (bridge)

Models:
  - tinyllama (chat model, 0.6GB)
  - nomic-embed-text (embeddings, 0.4GB)

GPU Support: Optional (CPU fallback)
```

**Characteristics:**
- Stateful (models cached)
- Runs local inference (no API calls)
- Bottleneck for latency
- ~2.5GB image size + model files
- CPU: Very high during inference
- Memory: ~2GB

---

## Storage Architecture

### Volume Management

```
┌──────────────────────────────────────────────────┐
│         Host System Storage                      │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ docker_volumes/                         │   │
│  │                                         │   │
│  │ ├── mysql_data/                         │   │
│  │ │   ├── codebase_intelligence/          │   │
│  │ │   │   ├── users.ibd                   │   │
│  │ │   │   ├── projects.ibd                │   │
│  │ │   │   ├── conversations.ibd           │   │
│  │ │   │   ├── messages.ibd                │   │
│  │ │   │   └── ... (indexes)               │   │
│  │ │   └── ib_logfile0, ib_logfile1        │   │
│  │ │                                       │   │
│  │ ├── chroma_data/                        │   │
│  │ │   ├── chroma.parquet                  │   │
│  │ │   ├── indices/                        │   │
│  │ │   │   └── codebase_documents/         │   │
│  │ │   │       ├── data.parquet            │   │
│  │ │   │       └── index_metadata.parquet  │   │
│  │ │   └── metadata.db (DuckDB)            │   │
│  │ │                                       │   │
│  │ ├── ollama_data/                        │   │
│  │ │   ├── models/                         │   │
│  │ │   │   ├── tinyllama/                  │   │
│  │ │   │   │   └── model.gguf (0.6GB)      │   │
│  │ │   │   └── nomic-embed-text/           │   │
│  │ │   │       └── model.gguf (0.4GB)      │   │
│  │ │   └── cache/                          │   │
│  │ │                                       │   │
│  │ └── projects_data/                      │   │
│  │     ├── {projectId1}/                   │   │
│  │     │   ├── .git/                       │   │
│  │     │   ├── src/                        │   │
│  │     │   ├── package.json                │   │
│  │     │   └── ... (repository files)      │   │
│  │     ├── {projectId2}/                   │   │
│  │     └── ...                             │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Storage Requirements

| Component | Size | Purpose |
|-----------|------|---------|
| MySQL data | 100MB - 1GB | Database files + indexes |
| Chroma data | 500MB - 5GB | Vector embeddings (scales with chunks) |
| Ollama data | 1GB (fixed) | tinyllama + nomic-embed-text models |
| Projects | 500MB - 10GB | Cloned repositories |
| **Total** | **2GB - 16GB** | Total disk space needed |

### Storage I/O Patterns

```
                    ┌─────────────────┐
                    │  Frontend App   │
                    └────────┬────────┘
                             │ HTTP
                    ┌────────▼────────┐
        ┌──────────►│  Backend API    │◄──────────┐
        │           └────────┬────────┘           │
        │                    │                    │
   READ/WRITE (low)     READ/WRITE (high)    READ (high)
        │                    │                    │
        ▼                    ▼                    ▼
   ┌────────┐          ┌────────┐          ┌──────────┐
   │ MySQL  │          │ Projects│         │ Ollama   │
   │  DB    │          │  Data   │         │  Models  │
   │        │          │         │         │          │
   │ ~1ms   │          │ ~10ms   │         │ WRITE 0  │
   │ latency│          │ latency │         │ READ only│
   └────────┘          └────────┘          └──────────┘
```

---

## Network Architecture

### Network Topology

```
┌─────────────────────────────────────────────────────┐
│         Host Network (0.0.0.0)                      │
│                                                     │
│  Port 3000 ┐                                        │
│  Port 3001 ├─────► Docker Host Interface (localhost)
│  Port 3306 │                                        │
│  Port 8000 │                                        │
│  Port 11434┘                                        │
│                    │                                │
│                    ▼                                │
│  ┌──────────────────────────────────────────────┐  │
│  │  codebase_network (bridge network)          │  │
│  │  Gateway: 172.18.0.1                        │  │
│  │  Subnet: 172.18.0.0/16                      │  │
│  │                                             │  │
│  │  Container IPs:                             │  │
│  │  ├─ frontend:    172.18.0.2 (port 3000)    │  │
│  │  ├─ backend:     172.18.0.3 (port 3001)    │  │
│  │  ├─ mysql:       172.18.0.4 (port 3306)    │  │
│  │  ├─ chroma:      172.18.0.5 (port 8000)    │  │
│  │  └─ ollama:      172.18.0.6 (port 11434)   │  │
│  │                                             │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Network Communication

```
Frontend (3000)
    ├─► Backend (3001)
    │    ├─► MySQL (3306)
    │    │    └─ Queries: users, projects, conversations, messages
    │    │
    │    ├─► Chroma (8000)
    │    │    └─ Search: Vector similarity on codebase_documents
    │    │
    │    └─► Ollama (11434)
    │         └─ Requests: 
    │            • /api/embed - Generate embeddings (768D)
    │            • /api/generate - Chat completion
    │
    └─► (Direct HTTP calls not used in production)

Service-to-Service DNS Resolution:
  - mysql (resolves to 172.18.0.4)
  - chroma (resolves to 172.18.0.5)
  - ollama (resolves to 172.18.0.6)
  - backend (resolves to 172.18.0.3)
  - frontend (resolves to 172.18.0.2)
```

### Connection Pooling

```
Backend Container
    │
    ├─► MySQL Connection Pool
    │   ├─ Min connections: 5
    │   ├─ Max connections: 20
    │   └─ Idle timeout: 30s
    │
    ├─► Ollama HTTP Client (single connection + keep-alive)
    │   └─ Timeout: 300 seconds (for inference)
    │
    └─► Chroma HTTP Client (connection pool)
        ├─ Max connections: 10
        └─ Timeout: 30 seconds
```

---

## Deployment Configuration (docker-compose.yml)

### File Structure

```yaml
version: '3.8'

services:
  # Frontend React App
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment: [API_BASE_URL=http://backend:3001]
    networks: [codebase_network]
    depends_on: [backend]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend Express API
  backend:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      - MYSQL_HOST=mysql
      - CHROMA_HOST=http://chroma:8000
      - OLLAMA_BASE_URL=http://ollama:11434
      - DATABASE_URL=mysql://...
    volumes:
      - projects_data:/app/data/projects
    networks: [codebase_network]
    depends_on:
      mysql: { condition: service_healthy }
      chroma: { condition: service_started }
      ollama: { condition: service_started }

  # MySQL Database
  mysql:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=...
      - MYSQL_DATABASE=codebase_intelligence
      - MYSQL_USER=...
      - MYSQL_PASSWORD=...
    volumes:
      - mysql_data:/var/lib/mysql
    networks: [codebase_network]
    ports: ["3306:3306"]
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]

  # Chroma Vector Database
  chroma:
    image: ghcr.io/chroma-core/chroma:latest
    environment:
      - CHROMA_DB_IMPL=duckdb+parquet
      - PERSIST_DIRECTORY=/chroma/data
    volumes:
      - chroma_data:/chroma/data
    networks: [codebase_network]
    ports: ["8000:8000"]

  # Ollama LLM Server
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    networks: [codebase_network]
    ports: ["11434:11434"]
    environment:
      - OLLAMA_MODELS_DIR=/root/.ollama/models

volumes:
  mysql_data:
  chroma_data:
  ollama_data:
  projects_data:

networks:
  codebase_network:
    driver: bridge
```

---

## Startup Sequence

```
1. Docker Daemon Starts
   │
2. Bridge Network Created (codebase_network)
   │
3. Volumes Mounted
   ├─ mysql_data (or created if new)
   ├─ chroma_data (or created if new)
   ├─ ollama_data (or created if new)
   └─ projects_data (or created if new)
   │
4. MySQL Container Starts
   ├─ Initializes database
   ├─ Creates schema
   ├─ Waits for health check (ready)
   │
5. Chroma Container Starts
   ├─ Loads/initializes DuckDB
   ├─ Loads vector indexes
   ├─ Listens on :8000
   │
6. Ollama Container Starts
   ├─ Loads models from ollama_data
   ├─ Starts inference server
   ├─ Listens on :11434
   │
7. Backend Container Starts
   ├─ Connects to MySQL
   ├─ Tests Chroma connection
   ├─ Tests Ollama connection
   ├─ Initializes RAG service
   ├─ Listens on :3001
   │
8. Frontend Container Starts
   ├─ Builds Vite bundle
   ├─ Serves on :3000
   │
9. Health Checks Pass ✓
   │
10. System Ready for Use
```

---

## Scaling Considerations

### Horizontal Scaling
```
# Current (Single Tier)
docker-compose up -d

# Multiple Backends (with load balancer)
docker-compose scale backend=3
# Requires: nginx/HAProxy for load balancing
```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for deployment instructions.
