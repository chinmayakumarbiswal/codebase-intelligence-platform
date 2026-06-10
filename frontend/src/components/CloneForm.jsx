import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import { apiClient } from '../services/apiClient';
import IndexingProgress from './IndexingProgress';

export default function CloneForm({ onSuccess }) {
  const [gitUrl, setGitUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [indexingProjectId, setIndexingProjectId] = useState(null); // Track indexing status

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gitUrl.trim() || !projectName.trim()) {
      setError('Git URL and project name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/projects/clone', {
        gitUrl,
        projectName,
        description,
      });

      // Start showing indexing progress
      const projectId = response.data.id || response.data.projectId;
      setIndexingProjectId(projectId);
      
      // Call onSuccess after indexing completes
      // (IndexingProgress component will handle completion)
      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Clone failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIndexingComplete = (progressData) => {
    console.log('Indexing complete:', progressData);
    // Could show a success message or take additional actions
    setIndexingProjectId(null); // Hide progress bar
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Show indexing progress if indexing is active */}
      {indexingProjectId && (
        <IndexingProgress
          projectId={indexingProjectId}
          onComplete={handleIndexingComplete}
        />
      )}

      <TextField
        label="Git Repository URL"
        value={gitUrl}
        onChange={(e) => setGitUrl(e.target.value)}
        fullWidth
        required
        disabled={loading || indexingProjectId}
        placeholder="https://github.com/user/repo.git"
        type="url"
      />

      <TextField
        label="Project Name"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        fullWidth
        required
        disabled={loading || indexingProjectId}
        helperText="Will default to repository name if empty"
      />

      <TextField
        label="Description (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        multiline
        rows={2}
        disabled={loading || indexingProjectId}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={!gitUrl.trim() || !projectName.trim() || loading || indexingProjectId}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : indexingProjectId ? '⏳ Indexing...' : 'Clone Repository'}
      </Button>
    </Box>
  );
}
