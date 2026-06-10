/**
 * Chat Routes v2 - LangChain Based
 * 
 * Simplified endpoints:
 * - POST /api/chat/ask - Main chat/RAG endpoint
 * - POST /api/chat/index - Index a codebase
 * - GET /api/chat/status - Get RAG status
 * 
 * All complexity moved to RAG service
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import ragService from '../rag/rag-service-langchain.js';
import { getPool } from '../database/connection.js';

const router = express.Router();

/**
 * POST /api/chat/ask
 * Main endpoint: Ask a question and get RAG-powered answer
 * 
 * Request body:
 * {
 *   "query": "How does the authentication work?",
 *   "projectId": "study-project" (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "query": "How does the authentication work?",
 *   "answer": "...",
 *   "sources": [{file, content, metadata}],
 *   "responseTime": 1234
 * }
 */
router.post('/ask', authMiddleware, async (req, res) => {
  try {
    const { query, projectId = 'default' } = req.body;

    // Validate input
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    // Check if RAG is initialized
    if (!ragService.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'RAG service not initialized. Try indexing a project first.',
      });
    }

    // Execute query with timeout
    const timeoutMs = 60000; // 60 seconds max for Ollama
    const queryPromise = ragService.query(query, projectId);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout (60s)')), timeoutMs)
    );

    const result = await Promise.race([queryPromise, timeoutPromise]);

    // Save to database (optional enhancement)
    try {
      // This would save to MySQL conversations table if database connection available
      // For now, just logging
      console.log(`[Chat] Saved conversation for user: ${req.userId}`);
    } catch (dbError) {
      console.warn('[Chat] Database save failed (non-critical):', dbError.message);
    }

    return res.json(result);
  } catch (error) {
    console.error('[Chat] /ask error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Query failed',
    });
  }
});

/**
 * POST /api/chat/index
 * Index a codebase for RAG
 * 
 * Request body:
 * {
 *   "projectId": "study-project",
 *   "codebasePath": "./src" (optional, uses .env default)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "projectId": "study-project",
 *   "filesLoaded": 45,
 *   "chunksCreated": 230,
 *   "indexedAt": "2026-06-10T..."
 * }
 */
router.post('/index', authMiddleware, async (req, res) => {
  try {
    const { projectId = 'default', codebasePath } = req.body;

    // Initialize RAG if not already done
    if (!ragService.isInitialized) {
      console.log('[Chat] Initializing RAG service...');
      await ragService.initialize();
    }

    // Index the project
    const result = await ragService.indexProject(projectId, codebasePath);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('[Chat] /index error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Indexing failed',
    });
  }
});

/**
 * GET /api/chat/status
 * Get RAG system status, indexed projects, and real-time indexing progress
 * 
 * Response:
 * {
 *   "isInitialized": true,
 *   "llmType": "ollama",
 *   "vectorStoreType": "chroma",
 *   "indexedProjects": ["study-project"],
 *   "projectDetails": {...},
 *   "indexingProgress": {
 *     "project-id": { 
 *       "fileCount": 23,
 *       "chunkCount": 2475,
 *       "embeddedChunks": 450,
 *       "percent": 18,
 *       "status": "indexing"
 *     }
 *   }
 * }
 */
router.get('/status', authMiddleware, (req, res) => {
  try {
    const status = ragService.getStatus();
    
    // Add indexing progress for all projects
    const allProgress = {};
    for (const projectId in ragService.indexingProgress) {
      allProgress[projectId] = ragService.indexingProgress[projectId];
    }
    
    return res.json({
      ...status,
      indexingProgress: allProgress,
    });
  } catch (error) {
    console.error('[Chat] /status error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/progress/:projectId
 * Get real-time indexing progress for a specific project (public endpoint)
 * 
 * Response:
 * {
 *   "projectId": "xyz",
 *   "fileCount": 23,
 *   "chunkCount": 2475,
 *   "embeddedChunks": 450,
 *   "percent": 18,
 *   "status": "indexing",
 *   "updatedAt": "2026-06-10T..."
 * }
 */
router.get('/progress/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const progress = ragService.getIndexingProgress(projectId);
    
    if (!progress) {
      return res.json({
        projectId,
        percent: 0,
        status: 'not-started',
      });
    }
    
    return res.json(progress);
  } catch (error) {
    console.error('[Chat] /progress error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/chat/clear
 * Clear all indexed documents (admin only)
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Vector store cleared"
 * }
 */
router.post('/clear', authMiddleware, async (req, res) => {
  try {
    // In production, add role check: if (req.userRole !== 'admin') return 403
    const result = await ragService.clear();
    return res.json(result);
  } catch (error) {
    console.error('[Chat] /clear error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/conversations/:projectId
 * Get all conversations for a project
 * 
 * Response:
 * {
 *   "success": true,
 *   "conversations": [
 *     { id, title, createdAt, updatedAt }
 *   ]
 * }
 */
router.get('/conversations/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId || 'anonymous';
    
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, title, created_at, updated_at, 
              (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) as messageCount
       FROM conversations 
       WHERE project_id = ? AND user_id = ? 
       ORDER BY updated_at DESC`,
      [projectId, userId]
    );

    return res.json({
      success: true,
      conversations: rows.map(row => ({
        id: row.id,
        title: row.title || 'Untitled',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: row.messageCount || 0,
      })),
    });
  } catch (error) {
    console.error('[Chat] /conversations error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/history/:conversationId
 * Get all messages in a conversation
 * 
 * Response:
 * {
 *   "success": true,
 *   "messages": [
 *     { role, content, chunks, timestamp }
 *   ]
 * }
 */
router.get('/history/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT role, content, source_chunks, created_at 
       FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return res.json({
      success: true,
      messages: rows.map(row => {
        // Handle source_chunks which might be:
        // - null/undefined
        // - JSON string (stored as text)
        // - Already parsed object (MySQL JSON type returns parsed)
        let chunks = [];
        
        if (row.source_chunks) {
          if (typeof row.source_chunks === 'string') {
            // It's a string, need to parse it
            try {
              chunks = JSON.parse(row.source_chunks);
            } catch (parseError) {
              console.warn(`[Chat] Failed to parse source_chunks for message:`, parseError.message);
              chunks = [];
            }
          } else if (typeof row.source_chunks === 'object') {
            // MySQL already parsed it for us (JSON type column)
            chunks = Array.isArray(row.source_chunks) ? row.source_chunks : [];
          }
        }
        
        return {
          role: row.role,
          content: row.content,
          chunks,
          timestamp: row.created_at,
        };
      }),
    });
  } catch (error) {
    console.error('[Chat] /history error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/chat/conversation
 * Start a new conversation with first message
 * 
 * Request body:
 * {
 *   "projectId": "study-project",
 *   "firstMessage": { "query": "..." }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "conversationId": "uuid",
 *   "response": "...",
 *   "chunks": [...]
 * }
 */
router.post('/conversation', authMiddleware, async (req, res) => {
  try {
    const { projectId = 'default', firstMessage } = req.body;
    const userId = req.userId || 'anonymous';

    if (!firstMessage || !firstMessage.query) {
      return res.status(400).json({
        success: false,
        error: 'firstMessage.query is required',
      });
    }

    const pool = getPool();
    const conversationId = uuidv4();
    const title = firstMessage.query ? firstMessage.query.substring(0, 100) : 'Untitled';
    
    // Initialize RAG if needed
    if (!ragService.isInitialized) {
      console.log('[Chat] Auto-initializing RAG service...');
      await ragService.initialize();
    }

    // Auto-index project in BACKGROUND if not already indexed
    const status = ragService.getStatus();
    if (!status.indexedProjects.includes(projectId)) {
      console.log(`[Chat] 🔄 Starting background indexing for project: ${projectId}`);
      
      // Start indexing without awaiting
      (async () => {
        try {
          // Get project path from database
          const [projectRows] = await pool.query(
            `SELECT storage_path FROM projects WHERE id = ?`,
            [projectId]
          );
          
          let projectPath = './src'; // fallback
          if (projectRows && projectRows.length > 0) {
            projectPath = projectRows[0].storage_path;
            console.log(`[Chat] 📁 Background indexing using path: ${projectPath}`);
          } else {
            console.warn(`[Chat] ⚠️ Project not found in database, using default path`);
          }
          
          const result = await ragService.indexProject(projectId, projectPath);
          console.log(`[Chat] ✅ Background indexing complete for ${projectId}: ${result.chunksCreated} chunks`);
        } catch (indexError) {
          console.error(`[Chat] ❌ Background indexing failed: ${indexError.message}`);
        }
      })(); // Fire and forget - don't await
    }
    
    // Create conversation
    await pool.execute(
      `INSERT INTO conversations (id, project_id, user_id, title) 
       VALUES (?, ?, ?, ?)`,
      [conversationId, projectId, userId, title]
    );

    // Query RAG
    const result = await ragService.query(firstMessage.query, projectId);
    
    // Save user message
    const userMsgId = uuidv4();
    await pool.execute(
      `INSERT INTO messages (id, conversation_id, role, content) 
       VALUES (?, ?, ?, ?)`,
      [userMsgId, conversationId, 'user', firstMessage.query]
    );

    // Save assistant message with chunks
    const assistantMsgId = uuidv4();
    await pool.execute(
      `INSERT INTO messages (id, conversation_id, role, content, source_chunks) 
       VALUES (?, ?, ?, ?, ?)`,
      [assistantMsgId, conversationId, 'assistant', result.answer, JSON.stringify(result.sources || [])]
    );

    return res.json({
      success: true,
      conversationId,
      response: result.answer,
      chunks: result.sources || [],
    });
  } catch (error) {
    console.error('[Chat] /conversation error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/chat/continue
 * Continue an existing conversation
 * 
 * Request body:
 * {
 *   "projectId": "study-project",
 *   "conversationId": "uuid",
 *   "query": "..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "response": "...",
 *   "chunks": [...]
 * }
 */
router.post('/continue', authMiddleware, async (req, res) => {
  try {
    const { projectId = 'default', conversationId, query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required',
      });
    }

    const pool = getPool();

    // Initialize RAG if needed
    if (!ragService.isInitialized) {
      console.log('[Chat] Auto-initializing RAG service...');
      await ragService.initialize();
    }

    // Auto-index project in BACKGROUND if not already indexed
    const status = ragService.getStatus();
    if (!status.indexedProjects.includes(projectId)) {
      console.log(`[Chat] 🔄 Starting background indexing for project: ${projectId}`);
      
      // Start indexing without awaiting
      (async () => {
        try {
          // Get project path from database
          const [projectRows] = await pool.query(
            `SELECT storage_path FROM projects WHERE id = ?`,
            [projectId]
          );
          
          let projectPath = './src'; // fallback
          if (projectRows && projectRows.length > 0) {
            projectPath = projectRows[0].storage_path;
            console.log(`[Chat] 📁 Background indexing using path: ${projectPath}`);
          } else {
            console.warn(`[Chat] ⚠️ Project not found in database, using default path`);
          }
          
          const result = await ragService.indexProject(projectId, projectPath);
          console.log(`[Chat] ✅ Background indexing complete for ${projectId}: ${result.chunksCreated} chunks`);
        } catch (indexError) {
          console.error(`[Chat] ❌ Background indexing failed: ${indexError.message}`);
        }
      })(); // Fire and forget - don't await
    }

    // Query RAG
    const result = await ragService.query(query, projectId);
    
    // Save user message
    const userMsgId = uuidv4();
    await pool.execute(
      `INSERT INTO messages (id, conversation_id, role, content) 
       VALUES (?, ?, ?, ?)`,
      [userMsgId, conversationId, 'user', query]
    );

    // Save assistant message with chunks
    const assistantMsgId = uuidv4();
    await pool.execute(
      `INSERT INTO messages (id, conversation_id, role, content, source_chunks) 
       VALUES (?, ?, ?, ?, ?)`,
      [assistantMsgId, conversationId, 'assistant', result.answer, JSON.stringify(result.sources || [])]
    );

    // Update conversation updated_at timestamp
    await pool.execute(
      `UPDATE conversations SET updated_at = NOW() WHERE id = ?`,
      [conversationId]
    );

    return res.json({
      success: true,
      response: result.answer,
      chunks: result.sources || [],
    });
  } catch (error) {
    console.error('[Chat] /continue error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/chat/conversation/:conversationId
 * Delete a conversation and all its messages
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Conversation deleted"
 * }
 */
router.delete('/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const pool = getPool();

    // Delete all messages first (cascade delete)
    await pool.execute(
      `DELETE FROM messages WHERE conversation_id = ?`,
      [conversationId]
    );

    // Delete conversation
    const [result] = await pool.execute(
      `DELETE FROM conversations WHERE id = ?`,
      [conversationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    return res.json({
      success: true,
      message: 'Conversation deleted',
    });
  } catch (error) {
    console.error('[Chat] /conversation/:id delete error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/conversation/:conversationId
 * Get a single conversation with all messages
 * 
 * Response:
 * {
 *   "success": true,
 *   "conversation": { id, title, createdAt, updatedAt },
 *   "messages": [{ role, content, chunks, timestamp }]
 * }
 */
router.get('/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const pool = getPool();

    // Get conversation details
    const [convRows] = await pool.execute(
      `SELECT id, title, created_at, updated_at 
       FROM conversations 
       WHERE id = ?`,
      [conversationId]
    );

    if (convRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    const conversation = convRows[0];

    // Get all messages
    const [msgRows] = await pool.execute(
      `SELECT role, content, source_chunks, created_at 
       FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title || 'Untitled',
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
      messages: msgRows.map(row => {
        // Handle source_chunks which might be:
        // - null/undefined
        // - JSON string (stored as text)
        // - Already parsed object (MySQL JSON type returns parsed)
        let chunks = [];
        
        if (row.source_chunks) {
          if (typeof row.source_chunks === 'string') {
            // It's a string, need to parse it
            try {
              chunks = JSON.parse(row.source_chunks);
            } catch (parseError) {
              console.warn(`[Chat] Failed to parse source_chunks for message:`, parseError.message);
              chunks = [];
            }
          } else if (typeof row.source_chunks === 'object') {
            // MySQL already parsed it for us (JSON type column)
            chunks = Array.isArray(row.source_chunks) ? row.source_chunks : [];
          }
        }
        
        return {
          role: row.role,
          content: row.content,
          chunks,
          timestamp: row.created_at,
        };
      }),
    });
  } catch (error) {
    console.error('[Chat] /conversation/:id get error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/chunks/:projectId
 * Get all indexed chunks for a project
 * 
 * Query params:
 *   - limit: Max number of chunks (default 100)
 * 
 * Response:
 * {
 *   "success": true,
 *   "chunks": [
 *     { id, content, metadata, distance, embedding }
 *   ],
 *   "total": 250,
 *   "projectId": "..."
 * }
 */
router.get('/chunks/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const result = await ragService.getChunks(projectId, limit);
    
    return res.json(result);
  } catch (error) {
    console.error('[Chat] /chunks error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/chat/search-chunks
 * Search for similar chunks using semantic similarity
 * 
 * Body:
 * {
 *   "query": "authentication middleware",
 *   "projectId": "...",
 *   "limit": 10
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "chunks": [
 *     { content, metadata, similarityScore }
 *   ],
 *   "query": "...",
 *   "projectId": "..."
 * }
 */
router.post('/search-chunks', authMiddleware, async (req, res) => {
  try {
    const { query, projectId, limit = 10 } = req.body;

    if (!query || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'query and projectId are required',
      });
    }

    const result = await ragService.searchChunks(query, projectId, limit);
    
    return res.json(result);
  } catch (error) {
    console.error('[Chat] /search-chunks error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
