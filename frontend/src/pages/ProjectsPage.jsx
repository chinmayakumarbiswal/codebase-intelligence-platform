import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Dialog,
  Tab,
  Tabs,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import UploadForm from '../components/UploadForm';
import CloneForm from '../components/CloneForm';
import AppHeader from '../components/AppHeader';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/projects');
      setProjects(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        setDeleting(projectId);
        await apiClient.delete(`/projects/${projectId}`);
        setProjects(projects.filter(p => p.id !== projectId));
      } catch (err) {
        alert('Failed to delete project: ' + (err.response?.data?.error || err.message));
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleProjectCreated = (newProject) => {
    setOpenDialog(false);
    setDialogTab(0);
    fetchProjects();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            My Projects
          </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenDialog(true)}
        >
          New Project
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {projects.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No projects yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Upload a ZIP file or clone a Git repository to get started
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenDialog(true)}
            >
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {projects.map(project => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)'
                  }
                }}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom noWrap>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {project.description || 'No description'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      📁 {project.fileCount || 0} files
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ⏱️ {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {project.repositoryUrl && (
                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                      🔗 {project.repositoryUrl}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project.id}`);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    disabled={deleting === project.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                  >
                    {deleting === project.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New Project Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={dialogTab} onChange={(e, v) => setDialogTab(v)}>
            <Tab label="Upload ZIP" />
            <Tab label="Clone Repository" />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {dialogTab === 0 && <UploadForm onSuccess={handleProjectCreated} />}
          {dialogTab === 1 && <CloneForm onSuccess={handleProjectCreated} />}
        </Box>
      </Dialog>
    </Container>
    </>
  );
}
