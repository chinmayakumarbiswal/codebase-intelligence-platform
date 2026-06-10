# Database Architecture

## Database Overview

**Database:** MySQL 8.0  
**Name:** `codebase_intelligence`  
**Encoding:** UTF-8 (utf8mb4)  
**Purpose:** Persistent storage for users, projects, conversations, and metadata

## Entity Relationship Diagram

```
┌─────────────┐
│   users     │
├─────────────┤
│ id (PK)     │
│ email       │
│ full_name   │
│ created_at  │
└──────┬──────┘
       │ 1:N
       │
    ┌──┴─────────────┬──────────────┐
    │                │              │
    ▼ 1:N            ▼ 1:N          ▼ 1:N
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  projects    │ │conversations │ │ custom_llms  │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ id (PK, FK)  │ │ id (PK)      │ │ id (PK)      │
│ user_id      │ │ user_id (FK) │ │ user_id (FK) │
│ name         │ │ project_id FK│ │ name         │
│ repo_url     │ │ title        │ │ model_type   │
│ storage_path │ │ created_at   │ │ config (JSON)│
│ status       │ │ updated_at   │ │ created_at   │
│ created_at   │ └──────┬───────┘ └──────────────┘
└──────────────┘        │ 1:N
                        │
                        ▼
                  ┌──────────────┐
                  │  messages    │
                  ├──────────────┤
                  │ id (PK)      │
                  │ conversation │
                  │   _id (FK)   │
                  │ role         │
                  │ content      │
                  │ source_chunks│
                  │ created_at   │
                  └──────────────┘
```

## Table Schemas

### 1. `users` Table

Stores user account information and authentication data.

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_oauth (oauth_id)
);
```

**Fields:**
- `id` - UUID primary key
- `email` - User email (unique)
- `full_name` - Display name
- `oauth_provider` - "github", "google", etc.
- `oauth_id` - Provider-specific ID
- `avatar_url` - Profile picture URL
- `created_at` - Account creation timestamp
- `updated_at` - Last modification timestamp
- `last_login_at` - Last session timestamp

---

### 2. `projects` Table

Stores information about cloned code repositories.

```sql
CREATE TABLE projects (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  repo_url VARCHAR(2048) NOT NULL,
  storage_path VARCHAR(2048) NOT NULL UNIQUE,
  status ENUM('cloning', 'indexing', 'ready', 'error') DEFAULT 'cloning',
  language VARCHAR(50),
  file_count INT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  indexed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

**Fields:**
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `name` - Project display name
- `description` - Project description
- `repo_url` - Git repository URL
- `storage_path` - Absolute path where project is cloned
- `status` - Current state (cloning/indexing/ready/error)
- `language` - Primary programming language
- `file_count` - Number of source files
- `chunk_count` - Number of indexed chunks
- `indexed_at` - Completion timestamp for indexing

---

### 3. `conversations` Table

Stores chat session metadata.

```sql
CREATE TABLE conversations (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  title VARCHAR(500),
  summary TEXT,
  message_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_created_at (created_at)
);
```

**Fields:**
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `project_id` - Foreign key to projects
- `title` - Conversation title (auto-generated)
- `summary` - Brief summary of conversation topic
- `message_count` - Total messages in conversation
- `created_at` - Start timestamp
- `updated_at` - Last activity timestamp

---

### 4. `messages` Table

Stores individual chat messages and their source chunks.

```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content LONGTEXT NOT NULL,
  source_chunks JSON,
  token_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_created_at (created_at)
);
```

**Fields:**
- `id` - UUID primary key
- `conversation_id` - Foreign key to conversations
- `role` - "user" or "assistant"
- `content` - Message text (supports long text)
- `source_chunks` - JSON array of retrieved chunks for assistant messages
  ```json
  [
    {
      "id": "chunk_uuid",
      "file": "src/app.js",
      "lineStart": 10,
      "lineEnd": 25,
      "similarity": 0.89,
      "text": "const express = require('express')..."
    }
  ]
  ```
- `token_count` - Approximate token count
- `created_at` - Message timestamp

---

### 5. `chunks` Table

Stores metadata about indexed code chunks.

```sql
CREATE TABLE chunks (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  file_extension VARCHAR(10),
  line_start INT,
  line_end INT,
  content LONGTEXT NOT NULL,
  language VARCHAR(50),
  embedding_id VARCHAR(255),
  embedding_generated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_file_path (file_path),
  INDEX idx_language (language)
);
```

**Fields:**
- `id` - UUID primary key
- `project_id` - Foreign key to projects
- `file_path` - Relative path within project
- `file_extension` - File type (.js, .py, etc.)
- `line_start` - Starting line number in original file
- `line_end` - Ending line number in original file
- `content` - Code chunk text
- `language` - Detected language
- `embedding_id` - Reference to Chroma vector ID
- `embedding_generated_at` - When embedding was created

---

### 6. `embeddings` Table

Metadata about embeddings (references to Chroma storage).

```sql
CREATE TABLE embeddings (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  chunk_id VARCHAR(36) NOT NULL,
  vector_id VARCHAR(255) NOT NULL UNIQUE,
  model_name VARCHAR(100) DEFAULT 'nomic-embed-text',
  dimensions INT DEFAULT 768,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_chunk_id (chunk_id)
);
```

**Fields:**
- `id` - UUID primary key
- `project_id` - Foreign key to projects
- `chunk_id` - Foreign key to chunks
- `vector_id` - Chroma vector store ID
- `model_name` - Embedding model used
- `dimensions` - Vector dimensions (always 768 for nomic)

---

## Data Flow Diagrams

### Insert Flow - New Chat Message

```
User sends message
        ↓
Backend validates JWT
        ↓
Create message record (role='user', content=text)
        ↓
INSERT INTO messages (conversation_id, role, content, created_at)
        ↓
Retrieve similar chunks from Chroma
        ↓
Generate LLM response
        ↓
Create assistant message (role='assistant', content=response)
        ↓
UPDATE messages.source_chunks = JSON_ARRAY([...])
        ↓
Response sent to frontend
```

### Insert Flow - New Project Index

```
User clones project
        ↓
INSERT INTO projects (user_id, name, repo_url, status='cloning')
        ↓
Clone repository to storage_path
        ↓
UPDATE projects (status='indexing', file_count=X)
        ↓
Chunk all files
        ↓
BATCH INSERT INTO chunks (project_id, file_path, content...)
        ↓
Send chunks to Ollama for embeddings
        ↓
BATCH INSERT INTO embeddings (project_id, chunk_id, vector_id)
        ↓
Chroma stores vectors with metadata: {projectId, fileName, ...}
        ↓
UPDATE projects (status='ready', chunk_count=Y, indexed_at=NOW())
        ↓
Frontend receives completion notification
```

## Query Patterns

### Pattern 1: Load Conversation History
```sql
SELECT m.id, m.role, m.content, m.source_chunks, m.created_at
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE c.id = ? AND c.user_id = ?
ORDER BY m.created_at ASC
LIMIT 100;
```

### Pattern 2: List User Projects
```sql
SELECT id, name, status, file_count, chunk_count, indexed_at
FROM projects
WHERE user_id = ?
ORDER BY updated_at DESC;
```

### Pattern 3: Get Chunk Metadata by Project
```sql
SELECT id, file_path, line_start, line_end, language
FROM chunks
WHERE project_id = ?
LIMIT 500;
```

### Pattern 4: Recent Conversations
```sql
SELECT c.id, c.title, c.message_count, c.updated_at
FROM conversations c
WHERE c.user_id = ? AND c.project_id = ?
ORDER BY c.updated_at DESC
LIMIT 10;
```

## Indexing Strategy

```
TABLE         | INDEX                    | PURPOSE
──────────────┼──────────────────────────┼─────────────────────
users         | idx_email, idx_oauth     | Fast user lookup
projects      | idx_user_id, idx_status  | Filter by user/status
conversations | idx_user_id, idx_project | User conversations
              | idx_created_at           | Sort by time
messages      | idx_conversation_id      | Get conversation msgs
chunks        | idx_project_id           | Retrieve project chunks
              | idx_language             | Filter by language
embeddings    | idx_project_id           | Embeddings per project
```

## Constraints & Relationships

1. **User → Projects:** 1:N (One user has many projects)
2. **User → Conversations:** 1:N (One user has many conversations)
3. **Project → Conversations:** 1:N (Project has many chats)
4. **Project → Chunks:** 1:N (Project has many code chunks)
5. **Conversation → Messages:** 1:N (Chat has many messages)
6. **Chunk → Embeddings:** 1:1 (One chunk, one embedding)

**Cascade Delete:**
- Delete user → Delete all projects, conversations, messages
- Delete project → Delete all conversations, chunks, embeddings
- Delete conversation → Delete all messages

## Performance Optimization

1. **Connection Pooling:** MySQL connection pool (10-20 connections)
2. **Query Caching:** Redis layer for frequently accessed data
3. **Batch Inserts:** 100-500 chunks per batch insert
4. **JSON Indexing:** Generated columns for JSON queries
5. **Pagination:** LIMIT 500 for large result sets
6. **Composite Indexes:** (user_id, created_at) for range queries

---

See [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md) for storage and network architecture.
