import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import StorageIcon from '@mui/icons-material/Storage';
import { apiClient } from '../services/apiClient';
import AppHeader from '../components/AppHeader';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/projects/${id}`);
      setProject(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Project not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/projects')}
          sx={{ mt: 2 }}
        >
          Back to Projects
        </Button>
      </Container>
    );
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/projects')}
          sx={{ mb: 3 }}
        >
          Back to Projects
        </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {project.name}
              </Typography>
              <Chip
                label={project.status}
                color={project.status === 'active' ? 'success' : 'default'}
                sx={{ mb: 2 }}
              />
            </Box>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {project.description || 'No description provided'}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ChatBubbleIcon />}
              onClick={() => navigate(`/projects/${id}/chat`)}
            >
              Open Chat
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<StorageIcon />}
              onClick={() => navigate(`/projects/${id}/embeddings`)}
            >
              View Embeddings
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Project ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                {project.id}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {new Date(project.created_at).toLocaleString()}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body2">
                {new Date(project.updated_at).toLocaleString()}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Files
              </Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {project.fileCount || 0}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Total Lines of Code
              </Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {project.totalLines ? project.totalLines.toLocaleString() : 0}
              </Typography>

              {project.repositoryUrl && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">
                    Repository URL
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {project.repositoryUrl}
                    </Typography>
                    <Button
                      size="small"
                      target="_blank"
                      rel="noopener"
                      href={project.repositoryUrl}
                      startIcon={<OpenInNewIcon />}
                      variant="text"
                    >
                      Open
                    </Button>
                  </Box>
                </>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Phase 3+ Features */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ✨ Features
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    💬 RAG Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Ask questions about your codebase with AI-powered answers and source citations.
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<ChatBubbleIcon />}
                    onClick={() => navigate(`/projects/${id}/chat`)}
                  >
                    Open Chat
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔍 Embeddings & Search
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    View semantic chunks and search for similar code patterns in your project.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<StorageIcon />}
                    onClick={() => navigate(`/projects/${id}/embeddings`)}
                  >
                    View Embeddings
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
    </>
  );
}
