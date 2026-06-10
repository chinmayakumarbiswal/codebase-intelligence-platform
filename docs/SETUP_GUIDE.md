# Setup & Deployment Guide

## Prerequisites

### System Requirements

| Requirement | Windows | Linux | macOS |
|-------------|---------|-------|-------|
| Docker | 4.0+ | 20.10+ | 4.0+ |
| Docker Compose | 2.0+ | 2.0+ | 2.0+ |
| RAM | 8GB minimum | 8GB minimum | 8GB minimum |
| Disk Space | 15GB | 15GB | 15GB |
| Git | 2.30+ | 2.30+ | 2.30+ |

### Pre-Installation Checklist

- [ ] Docker Desktop installed and running
- [ ] Docker Compose available (`docker-compose --version`)
- [ ] Git configured with SSH or HTTPS
- [ ] 15GB free disk space
- [ ] Ports 3000, 3001, 3306, 8000, 11434 available

---

## Installation & Setup

### Step 1: Clone the Repository

#### Option A: HTTPS (Recommended for Windows)
```bash
git clone https://github.com/chinmayakumarbiswal/codebase-intelligence-platform.git
cd codebase-intelligence-platform
```

#### Option B: SSH (Recommended for Linux/macOS)
```bash
git clone git@github.com:chinmayakumarbiswal/codebase-intelligence-platform.git
cd codebase-intelligence-platform
```

---

### Step 2: Configure Environment

#### Create `.env` file from template
```bash
# Windows PowerShell
Copy-Item .env.example -Destination .env

# Linux/macOS bash
cp .env.example .env
```

#### Edit `.env` with your configuration
```bash
# Edit the file with your preferred editor
# Windows
notepad .env

# Linux/macOS
nano .env
# or
vim .env
```

#### Required `.env` Variables
```env
# Database Configuration
MYSQL_ROOT_PASSWORD=secure_root_password_here
MYSQL_USER=codebase_user
MYSQL_PASSWORD=secure_password_here
MYSQL_DATABASE=codebase_intelligence

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_minimum_32_chars

# OAuth Configuration (GitHub)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/callback

# LLM Configuration
LLM_TYPE=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=tinyllama
EMBEDDING_MODEL=nomic-embed-text

# Vector Store
VECTOR_STORE_TYPE=chroma
CHROMA_HOST=http://chroma:8000

# Code Processing
CHUNK_SIZE=2000
CHUNK_OVERLAP=50
CODEBASE_FILE_EXTENSIONS=.js,.jsx,.ts,.tsx,.py,.php,.cs,.vb,.java,.go,.rs,.rb,.kt,.swift,.cpp,.c,.h,.hpp,.m,.scala,.sh,.bash,.sql,.html,.css

# API Configuration
AXIOS_TIMEOUT=300000
```

---

### Step 3: Build Docker Images

#### Windows (PowerShell)
```powershell
cd docker
docker-compose down
docker rmi docker-frontend docker-backend -f
docker-compose up --build -d
```

#### Linux/macOS (Bash)
```bash
cd docker
docker-compose down
docker rmi docker-frontend docker-backend -f
docker-compose up --build -d
```

#### Verify Build Success
```bash
docker ps

# Expected output:
# CONTAINER ID   IMAGE              STATUS              PORTS
# xxxxxxxx       docker-frontend    Up About a minute   0.0.0.0:3000->3000/tcp
# xxxxxxxx       docker-backend     Up About a minute   0.0.0.0:3001->3001/tcp
# xxxxxxxx       mysql:8            Up About a minute   0.0.0.0:3306->3306/tcp
# xxxxxxxx       chroma:latest      Up About a minute   0.0.0.0:8000->8000/tcp
# xxxxxxxx       ollama:latest      Up About a minute   0.0.0.0:11434->11434/tcp
```

---

### Step 4: Verify Installation

#### Check Service Health

```bash
# Frontend Health (should return 360+ characters of HTML)
curl -s http://localhost:3000 | wc -c

# Backend Health (should return JSON error about auth)
curl -s http://localhost:3001/api/projects

# MySQL Health
mysql -h 127.0.0.1 -u codebase_user -p -e "SELECT 1"
# Enter MYSQL_PASSWORD when prompted

# Chroma Health
curl -s http://localhost:8000/api/v1/heartbeat

# Ollama Health
curl -s http://localhost:11434/api/tags
```

#### Check Container Logs

```bash
# Frontend logs
docker logs codebase_frontend --tail 20

# Backend logs
docker logs codebase_backend --tail 20

# MySQL logs
docker logs codebase_mysql --tail 20

# Chroma logs
docker logs codebase_chroma --tail 20

# Ollama logs
docker logs codebase_ollama --tail 20
```

---

## Running the Application

### Access the Application

1. **Frontend:** Open browser to http://localhost:3000
2. **Backend API:** http://localhost:3001/api/
3. **MySQL:** Port 3306 (from container network)
4. **Chroma:** http://localhost:8000/api/v1
5. **Ollama:** http://localhost:11434/api

### First-Time Setup Flow

1. Navigate to http://localhost:3000
2. Click "Login" (redirects to OAuth provider)
3. Authenticate with GitHub/Google
4. Return to application
5. Click "+ Clone Project"
6. Enter repository URL (e.g., `https://github.com/user/repo.git`)
7. Wait for indexing to complete (progress bar shows status)
8. Once indexed, click "Open Chat" to start asking questions

---

## Production Deployment

### Windows Server

#### Step 1: Install Docker Desktop
- Download from https://www.docker.com/products/docker-desktop
- Enable WSL 2 backend
- Restart system

#### Step 2: Clone Repository
```powershell
git clone https://github.com/chinmayakumarbiswal/codebase-intelligence-platform.git
cd codebase-intelligence-platform
```

#### Step 3: Create Production `.env`
```powershell
# Copy and edit
Copy-Item .env.example -Destination .env
notepad .env

# Critical production settings:
# - Use strong passwords
# - Set proper JWT_SECRET (32+ characters)
# - Configure HTTPS URLs
# - Set production database credentials
```

#### Step 4: Deploy
```powershell
cd docker
docker-compose -f docker-compose.yml up -d
```

#### Step 5: Monitor
```powershell
# Watch logs
docker logs codebase_backend -f

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

### Linux Server (Ubuntu/Debian)

#### Step 1: Install Docker
```bash
# Update package manager
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

#### Step 2: Clone Repository
```bash
git clone https://github.com/chinmayakumarbiswal/codebase-intelligence-platform.git
cd codebase-intelligence-platform
```

#### Step 3: Create Production `.env`
```bash
# Copy template
cp .env.example .env

# Edit with secure values
sudo nano .env

# Set correct permissions
chmod 600 .env
```

#### Step 4: Create Systemd Service (Optional)

Create `/etc/systemd/system/codebase-intelligence.service`:

```ini
[Unit]
Description=Codebase Intelligence Service
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/codebase-intelligence/docker
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always
RestartSec=10
User=ubuntu

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable codebase-intelligence
sudo systemctl start codebase-intelligence
```

#### Step 5: Deploy
```bash
cd docker
docker-compose up -d

# Monitor
docker-compose logs -f backend
```

---

### Linux Server (CentOS/RHEL)

#### Step 1: Install Docker
```bash
# Install yum-utils
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### Step 2-5: Same as Ubuntu above

---

## Backup & Recovery

### Backup Procedure

```bash
# Backup all volumes
docker run --rm \
  -v codebase_mysql_data:/data \
  -v codebase_chroma_data:/chroma \
  -v codebase_ollama_data:/ollama \
  -v codebase_projects_data:/projects \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/codebase-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
    -C / data chroma ollama projects
```

### Restore Procedure

```bash
# Stop containers
docker-compose down

# Extract backup
cd docker
tar xzf ../backups/codebase-backup-YYYYMMDD-HHMMSS.tar.gz -C /var/lib/docker/volumes/

# Restart services
docker-compose up -d
```

---

## Troubleshooting

### Issue: "Ports already in use"

```bash
# Windows - Find process using port
netstat -ano | findstr :3000

# Linux/macOS - Find process using port
lsof -i :3000

# Kill process or change port in docker-compose.yml
```

### Issue: "MySQL connection failed"

```bash
# Check MySQL container logs
docker logs codebase_mysql

# Verify credentials in .env
# Verify MYSQL_PASSWORD matches in docker-compose.yml

# Restart MySQL
docker-compose restart mysql
```

### Issue: "Chroma connection error"

```bash
# Check Chroma health
curl http://localhost:8000/api/v1/heartbeat

# Restart Chroma
docker-compose restart chroma
```

### Issue: "Ollama model not found"

```bash
# Pull required models
docker exec codebase_ollama ollama pull tinyllama
docker exec codebase_ollama ollama pull nomic-embed-text

# Verify models
curl http://localhost:11434/api/tags
```

### Issue: "Out of disk space"

```bash
# Check docker disk usage
docker system df

# Clean up unused images/containers/volumes
docker system prune -a --volumes

# Note: This deletes data! Backup first.
```

---

## Performance Tuning

### Increase Ollama Inference Performance

```env
# In .env or docker-compose.yml
OLLAMA_NUM_PARALLEL=4        # Increase parallel requests
OLLAMA_NUM_GPU=1              # GPU acceleration (if available)
OLLAMA_MODELS_DIR=/root/.ollama/models
```

### Increase MySQL Performance

```env
# MySQL my.cnf equivalent in docker-compose
MYSQL_MAX_CONNECTIONS=1000
MYSQL_DEFAULT_STORAGE_ENGINE=InnoDB
MYSQL_INNODB_BUFFER_POOL_SIZE=1G
```

### Increase Chroma Performance

```env
# Chroma environment
CHROMA_QUERY_MAX_SIZE=10000
CHROMA_BATCH_SIZE=1000
```

---

## Monitoring & Logs

### Docker Compose Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs -n 100 backend

# With timestamps
docker-compose logs -f --timestamps backend
```

### System Resource Usage

```bash
# Container stats
docker stats

# Memory usage
docker ps --format "table {{.Names}}\t{{.MemUsage}}"

# CPU usage
docker ps --format "table {{.Names}}\t{{.CPUPerc}}"
```

---

## Stopping & Starting Services

### Stop All Services
```bash
cd docker
docker-compose down
```

### Start All Services
```bash
cd docker
docker-compose up -d
```

### Restart Specific Service
```bash
docker-compose restart backend
```

### View Service Status
```bash
docker-compose ps
```

---

## Updating the Application

### Pull Latest Code
```bash
git pull origin main
```

### Rebuild Images
```bash
cd docker
docker-compose down
docker rmi docker-frontend docker-backend
docker-compose up --build -d
```

### Database Migrations
```bash
# Migrations run automatically on backend startup
docker-compose up -d
docker logs codebase_backend -f
# Look for "Database schema initialized" message
```

---

---

## API Reference

### Base Configuration

- **Base URL:** `http://localhost:3001/api`
- **Authentication:** JWT Bearer token in `Authorization` header
- **Response Format:** JSON
- **Default Timeout:** 300 seconds (5 minutes)

### Authentication Header

```bash
Authorization: Bearer eyJhbGc...
```

---

## Endpoints

### 1. Authentication Endpoints (5 endpoints)

#### POST /auth/login
Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

#### POST /auth/github
OAuth login with GitHub.

**Response:**
```json
{
  "redirectUrl": "https://github.com/login/oauth/authorize?client_id=..."
}
```

#### GET /auth/callback
OAuth callback handler. Redirects to /projects on success.

**Query Parameters:**
- `code` - GitHub authorization code

#### GET /auth/profile
Get current user profile (requires authentication).

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### POST /auth/logout
Logout user and invalidate token.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### 2. Projects Endpoints (5 endpoints)

#### POST /projects/clone
Clone a Git repository and start indexing.

**Request:**
```json
{
  "name": "My Project",
  "repoUrl": "https://github.com/user/repo.git",
  "branch": "main"
}
```

**Response:**
```json
{
  "projectId": "project-uuid",
  "name": "My Project",
  "repoUrl": "https://github.com/user/repo.git",
  "status": "cloning",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### GET /projects
List all projects for the current user.

**Query Parameters:**
- `limit` (default: 20) - Results per page
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "projects": [
    {
      "id": "project-uuid",
      "name": "My Project",
      "repoUrl": "https://github.com/user/repo.git",
      "status": "ready",
      "fileCount": 120,
      "chunkCount": 450,
      "indexedAt": "2024-01-15T11:00:00Z",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

#### GET /projects/:projectId
Get details of a specific project.

**Response:**
```json
{
  "id": "project-uuid",
  "name": "My Project",
  "repoUrl": "https://github.com/user/repo.git",
  "status": "ready",
  "fileCount": 120,
  "chunkCount": 450,
  "embeddedChunks": 450,
  "indexedAt": "2024-01-15T11:00:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### PUT /projects/:projectId
Update project metadata.

**Request:**
```json
{
  "name": "Updated Project Name"
}
```

**Response:**
```json
{
  "id": "project-uuid",
  "name": "Updated Project Name",
  "status": "ready"
}
```

#### DELETE /projects/:projectId
Delete a project and all associated data.

**Response:**
```json
{
  "message": "Project deleted successfully",
  "projectId": "project-uuid"
}
```

---

### 3. Chat Endpoints (5 endpoints)

#### POST /chat/conversation
Start a new chat conversation.

**Request:**
```json
{
  "projectId": "project-uuid",
  "firstMessage": "What does this project do?"
}
```

**Response:**
```json
{
  "conversationId": "conv-uuid",
  "message": {
    "id": "msg-uuid",
    "role": "assistant",
    "content": "This project is...",
    "sourceChunks": [
      {
        "file": "README.md",
        "lineStart": 1,
        "preview": "..."
      }
    ]
  }
}
```

#### GET /chat/conversations/:projectId
List all conversations for a project.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-uuid",
      "title": "Understanding the API",
      "messageCount": 5,
      "updatedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 10
}
```

#### GET /chat/history/:conversationId
Get message history for a conversation.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "conversationId": "conv-uuid",
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "How does authentication work?",
      "createdAt": "2024-01-15T10:25:00Z"
    },
    {
      "id": "msg-uuid",
      "role": "assistant",
      "content": "Authentication is handled through...",
      "sourceChunks": [...]
    }
  ],
  "total": 15
}
```

#### POST /chat/message
Send a message in an existing conversation.

**Request:**
```json
{
  "conversationId": "conv-uuid",
  "message": "What files use the database module?"
}
```

**Response:**
```json
{
  "message": {
    "id": "msg-uuid",
    "role": "assistant",
    "content": "Based on the codebase...",
    "sourceChunks": [
      {
        "file": "src/db/connection.js",
        "lineStart": 10,
        "lineEnd": 25,
        "preview": "..."
      }
    ]
  }
}
```

#### DELETE /chat/conversations/:conversationId
Delete a conversation and all its messages.

**Response:**
```json
{
  "message": "Conversation deleted successfully",
  "conversationId": "conv-uuid"
}
```

---

### 4. Code Search & Chunks Endpoints (3 endpoints)

#### POST /chat/search-chunks
Perform semantic search across indexed code chunks.

**Request:**
```json
{
  "query": "database connection pool",
  "projectId": "project-uuid",
  "limit": 10,
  "minSimilarity": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "chunk-uuid",
      "file": "src/db/connection.js",
      "language": "javascript",
      "similarity": 0.89,
      "lineStart": 10,
      "lineEnd": 25,
      "preview": "const pool = mysql.createPool({..."
    }
  ],
  "totalResults": 5
}
```

#### GET /chat/chunks/:projectId
Get all indexed code chunks for a project.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)
- `language` (optional) - Filter by programming language

**Response:**
```json
{
  "chunks": [
    {
      "id": "chunk-uuid",
      "file": "src/app.js",
      "language": "javascript",
      "lineStart": 1,
      "lineEnd": 50,
      "preview": "const express = require('express');",
      "tokens": 234
    }
  ],
  "total": 450,
  "fileCount": 120,
  "languages": ["javascript", "html", "css"]
}
```

#### GET /chat/progress/:projectId
Get real-time indexing progress (no authentication required).

**Response:**
```json
{
  "projectId": "uuid",
  "status": "indexing",
  "percent": 45,
  "fileCount": 120,
  "processedFiles": 54,
  "chunkCount": 450,
  "embeddedChunks": 200,
  "estimatedTimeRemaining": 120
}
```

---

### 5. Embeddings Endpoints (2 endpoints)

#### GET /embeddings/:projectId
Get embeddings statistics for a project.

**Response:**
```json
{
  "projectId": "project-uuid",
  "totalEmbeddings": 450,
  "embeddedChunks": 450,
  "embeddingModel": "nomic-embed-text",
  "embeddingDimension": 768,
  "vectorStoreType": "chroma",
  "averageSimilarity": 0.78
}
```

#### POST /embeddings/search
Advanced vector similarity search with filtering.

**Request:**
```json
{
  "projectId": "project-uuid",
  "query": "authentication",
  "limit": 20,
  "filters": {
    "language": "javascript",
    "file": "src/auth/*"
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "chunk-uuid",
      "file": "src/auth/jwt.js",
      "similarity": 0.92,
      "preview": "..."
    }
  ],
  "searchTime": 45,
  "totalResults": 15
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| **200** | Success - Request completed successfully |
| **201** | Created - New resource created successfully |
| **204** | No Content - Success with no response body |
| **400** | Bad Request - Invalid parameters or malformed request |
| **401** | Unauthorized - Missing or invalid authentication token |
| **403** | Forbidden - Authenticated but not authorized for resource |
| **404** | Not Found - Resource does not exist |
| **429** | Too Many Requests - Rate limit exceeded |
| **500** | Internal Server Error - Server-side error |

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details if available",
  "code": "ERROR_CODE"
}
```

### Common Error Responses

**401 Unauthorized**
```json
{
  "error": "Invalid or missing authentication token",
  "code": "AUTH_INVALID_TOKEN"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found",
  "resource": "project",
  "code": "RESOURCE_NOT_FOUND"
}
```

**400 Bad Request**
```json
{
  "error": "Invalid request parameters",
  "details": "projectId is required",
  "code": "INVALID_PARAMS"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "requestId": "req-uuid",
  "code": "INTERNAL_ERROR"
}
```

---

## API Summary

| Category | Count | Endpoints |
|----------|-------|-----------|
| Authentication | 5 | Login, GitHub OAuth, Callback, Profile, Logout |
| Projects | 5 | Clone, List, Get, Update, Delete |
| Chat | 5 | Conversation, History, Message, Delete |
| Search & Chunks | 3 | Search, Get Chunks, Progress |
| Embeddings | 2 | Stats, Advanced Search |
| **TOTAL** | **20+** | **Complete RAG API** |

---

