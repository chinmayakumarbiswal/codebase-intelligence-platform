import express from 'express';
import { getRAGService } from '../rag/rag-service.js';
import { authMiddleware } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const ragService = getRAGService();

/**
 * POST /api/chat/message
 * Send a message and get RAG-powered response
 */
router.post('/message', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId, query, conversationId } = req.body;

    if (!projectId || !query) {
      return res.status(400).json({ error: 'projectId and query are required' });
    }

    logger.info(`Chat message from user ${userId} for project ${projectId}`);

    // Get conversation history if provided
    let conversationHistory = [];
    if (conversationId) {
      conversationHistory = await ragService.getConversationHistory(conversationId, userId);
    }

    // Generate RAG response
    const ragResponse = await ragService.generateRAGResponse(projectId, userId, query, conversationHistory);

    res.json({
      success: true,
      query,
      response: ragResponse.response,
      chunks: ragResponse.chunks,
      model: ragResponse.model,
      tokensUsed: ragResponse.tokensUsed,
    });
  } catch (error) {
    logger.error('Chat message failed:', error);
    res.status(500).json({ error: error.message || 'Failed to process message' });
  }
});

/**
 * POST /api/chat/conversation
 * Create new conversation
 */
router.post('/conversation', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId, firstMessage } = req.body;

    if (!projectId || !firstMessage) {
      return res.status(400).json({ error: 'projectId and firstMessage are required' });
    }

    logger.info(`Creating conversation for project ${projectId}`);

    // Generate response for first message
    const ragResponse = await ragService.generateRAGResponse(projectId, userId, firstMessage.query, []);

    // Save conversation
    const messages = [
      { role: 'user', content: firstMessage.query, chunks: null },
      { role: 'assistant', content: ragResponse.response, chunks: ragResponse.chunks },
    ];

    const conversationId = await ragService.saveConversation(projectId, userId, messages);

    res.status(201).json({
      success: true,
      conversationId,
      query: firstMessage.query,
      response: ragResponse.response,
      chunks: ragResponse.chunks,
      model: ragResponse.model,
    });
  } catch (error) {
    logger.error('Failed to create conversation:', error);
    res.status(500).json({ error: error.message || 'Failed to create conversation' });
  }
});

/**
 * GET /api/chat/conversations/:projectId
 * Get all conversations for a project
 */
router.get('/conversations/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    logger.info(`Fetching conversations for project ${projectId}`);

    const conversations = await ragService.getProjectConversations(projectId, userId);

    res.json({
      success: true,
      projectId,
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    logger.error('Failed to fetch conversations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/chat/history/:conversationId
 * Get conversation history
 */
router.get('/history/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    logger.info(`Fetching history for conversation ${conversationId}`);

    const messages = await ragService.getConversationHistory(conversationId, userId);

    res.json({
      success: true,
      conversationId,
      messages,
      count: messages.length,
    });
  } catch (error) {
    logger.error('Failed to fetch conversation history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversation history' });
  }
});

/**
 * DELETE /api/chat/conversation/:conversationId
 * Delete a conversation
 */
router.delete('/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    logger.info(`Deleting conversation ${conversationId}`);

    await ragService.deleteConversation(conversationId, userId);

    res.json({
      success: true,
      message: 'Conversation deleted',
      conversationId,
    });
  } catch (error) {
    logger.error('Failed to delete conversation:', error);
    res.status(500).json({ error: error.message || 'Failed to delete conversation' });
  }
});

/**
 * POST /api/chat/continue
 * Continue existing conversation (add new message)
 */
router.post('/continue', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId, conversationId, query } = req.body;

    if (!projectId || !conversationId || !query) {
      return res.status(400).json({ error: 'projectId, conversationId, and query are required' });
    }

    logger.info(`Continuing conversation ${conversationId}`);

    // Get conversation history
    const conversationHistory = await ragService.getConversationHistory(conversationId, userId);

    // Generate response
    const ragResponse = await ragService.generateRAGResponse(projectId, userId, query, conversationHistory);

    // Save new messages to conversation
    const userMsgId = Math.random().toString(36).substring(2, 11);
    const assistantMsgId = Math.random().toString(36).substring(2, 11);

    await ragService.pool.query(
      `INSERT INTO messages (id, conversation_id, role, content, source_chunks, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userMsgId, conversationId, 'user', query, null]
    );

    await ragService.pool.query(
      `INSERT INTO messages (id, conversation_id, role, content, source_chunks, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [assistantMsgId, conversationId, 'assistant', ragResponse.response, JSON.stringify(ragResponse.chunks)]
    );

    res.json({
      success: true,
      conversationId,
      query,
      response: ragResponse.response,
      chunks: ragResponse.chunks,
      model: ragResponse.model,
    });
  } catch (error) {
    logger.error('Failed to continue conversation:', error);
    res.status(500).json({ error: error.message || 'Failed to continue conversation' });
  }
});

export default router;
