import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/connection.js';
import { initAuthRoutes } from './auth/routes.js';
import { authMiddleware } from './middleware/auth.js';
import projectRoutes from './projects/routes.js';
import chatRoutesV2 from './chat/routes-v2.js';
import ragService from './rag/rag-service-langchain.js';
import { getConfigSummary } from './rag/langchain-config.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes (public) - before rate limiter
initAuthRoutes(app);

// Rate limiting - applied after auth routes to exempt them
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    // Skip rate limiting for public auth endpoints
    return req.path.startsWith('/api/auth/');
  },
});
app.use('/api/', limiter);

// Protected routes middleware (skip auth for public endpoints like progress)
app.use('/api/', (req, res, next) => {
  // Skip authentication for public endpoints
  if (req.path === '/chat/progress' || req.path.match(/^\/chat\/progress\//)) {
    return next();
  }
  
  // Apply auth middleware for other routes
  authMiddleware(req, res, next);
});

// Project routes
app.use('/api/projects', projectRoutes);

// Chat routes - v2 (LangChain based RAG)
app.use('/api/chat', chatRoutesV2);
// Legacy chat routes (deprecated)
// app.use('/api/chat', chatRoutes);

// Test protected endpoint
app.get('/api/auth/me', (req, res) => {
  res.json(req.user || { message: 'User info not available' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize RAG service
async function initializeRAG() {
  try {
    console.log('[Server] Initializing RAG service...');
    const config = getConfigSummary();
    console.log('[Server] RAG Configuration:', JSON.stringify(config, null, 2));
    
    await ragService.initialize();
    console.log('[Server] ✅ RAG service initialized successfully');
    return true;
  } catch (error) {
    console.error('[Server] ⚠️  RAG initialization warning (non-critical):', error.message);
    console.log('[Server] Note: RAG will be initialized on first /api/chat/index call');
    return false;
  }
}

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize RAG service (non-blocking if fails)
    await initializeRAG();

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    
    // Set timeout for long-running requests (LLM generation can be slow)
    server.requestTimeout = 180000; // 3 minutes
    server.timeout = 180000; // 3 minutes
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
