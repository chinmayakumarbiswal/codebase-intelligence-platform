import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import Chat from '../components/Chat.jsx';
import AppHeader from '../components/AppHeader.jsx';
import { apiClient } from '../services/apiClient.js';

/**
 * Chat Page - RAG-powered conversational interface for a project
 */
export default function ChatPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/projects/${projectId}`);
      setProject(response.data.project);
      setError(null);
    } catch (error) {
      console.error('Failed to load project:', error);
      setError('Project not found');
      setTimeout(() => navigate('/projects'), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <>
      <AppHeader />
      <Box sx={{ height: 'calc(100vh - 70px)', width: '100%' }}>
        <Chat projectId={projectId} />
      </Box>
    </>
  );
}
