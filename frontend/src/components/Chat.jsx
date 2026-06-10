import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { apiClient } from '../services/apiClient.js';

/**
 * Chat Component - RAG-powered conversational interface
 */
export default function Chat({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSourceChunks, setSelectedSourceChunks] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    if (projectId) {
      loadConversations();
    }
  }, [projectId]);

  /**
   * Load all conversations for this project
   */
  const loadConversations = async () => {
    try {
      const response = await apiClient.get(`/chat/conversations/${projectId}`);
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  /**
   * Start new conversation
   */
  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setQuery('');
  };

  /**
   * Load existing conversation
   */
  const loadConversation = async (convId) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/chat/history/${convId}`);
      const messages = response.data.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        chunks: msg.chunks,
        timestamp: msg.timestamp,
      }));
      setMessages(messages);
      setConversationId(convId);
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send message and get RAG response
   */
  const sendMessage = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    const userMessage = {
      role: 'user',
      content: query,
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      let response;

      if (conversationId) {
        // Continue existing conversation
        response = await apiClient.post('/chat/continue', {
          projectId,
          conversationId,
          query,
        });
      } else {
        // Start new conversation
        response = await apiClient.post('/chat/conversation', {
          projectId,
          firstMessage: { query },
        });
        setConversationId(response.data.conversationId);
      }

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        chunks: response.data.chunks,
        model: response.data.model,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Reload conversations list
      loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || error.message}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete conversation
   */
  const deleteConversation = async (convId) => {
    if (window.confirm('Delete this conversation?')) {
      try {
        await apiClient.delete(`/chat/conversation/${convId}`);

        loadConversations();
        if (conversationId === convId) {
          startNewConversation();
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar with conversation history */}
      <Box
        sx={{
          width: 300,
          backgroundColor: '#fff',
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={startNewConversation}
            sx={{ textTransform: 'none' }}
          >
            New Chat
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
            Conversations
          </Typography>

          {conversations.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#999' }}>
              No conversations yet
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {conversations.map(conv => (
                <ListItem
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  selected={conversationId === conv.id}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                    py: 1,
                    px: 1,
                  }}
                >
                  <ListItemText
                    primary={conv.title || 'Untitled'}
                    secondary={`${conv.messageCount} messages`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                    sx={{ my: 0 }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* Main chat area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Messages display */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ mb: 2, color: '#999' }}>
                  Start a conversation
                </Typography>
                <Typography variant="body2" sx={{ color: '#bbb' }}>
                  Ask questions about your codebase and get AI-powered answers with source citations
                </Typography>
              </Box>
            </Box>
          ) : (
            messages.map((message, index) => (
              <Box key={index}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Card
                    sx={{
                      maxWidth: '70%',
                      backgroundColor: message.role === 'user' ? '#2196F3' : '#f5f5f5',
                      color: message.role === 'user' ? '#fff' : '#000',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message.content}
                      </Typography>
                      {message.timestamp && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
                          {formatTime(message.timestamp)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>

                {/* Source citations */}
                {message.chunks && message.chunks.length > 0 && (
                  <Box sx={{ ml: 2, mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 'bold' }}>
                      Sources:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      {message.chunks.map((chunk, idx) => (
                        <Chip
                          key={idx}
                          label={`${chunk.chunkName} (${chunk.filePath}:${chunk.startLine})`}
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedSourceChunks(chunk)}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {index < messages.length - 1 && <Divider sx={{ my: 1 }} />}
              </Box>
            ))
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={30} />
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Message input */}
        <Box
          sx={{
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#fff',
            p: 2,
          }}
        >
          <form onSubmit={sendMessage}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="Ask about your codebase..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                multiline
                maxRows={4}
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !query.trim()}
                endIcon={<SendIcon />}
              >
                Send
              </Button>
            </Box>
          </form>
        </Box>
      </Box>

      {/* Source chunk modal */}
      <Dialog
        open={!!selectedSourceChunks}
        onClose={() => setSelectedSourceChunks(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedSourceChunks?.chunkName}
          <IconButton
            onClick={() => setSelectedSourceChunks(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              {selectedSourceChunks?.filePath} • Lines {selectedSourceChunks?.startLine}-
              {selectedSourceChunks?.endLine}
            </Typography>
            <Paper
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: '#f5f5f5',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                overflowX: 'auto',
              }}
            >
              <code>{selectedSourceChunks?.text}</code>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSourceChunks(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
