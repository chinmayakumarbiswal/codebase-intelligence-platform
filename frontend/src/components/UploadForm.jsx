import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { apiClient } from '../services/apiClient';

export default function UploadForm({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile);
      setError(null);
      // Auto-fill project name from ZIP filename
      if (!projectName) {
        setProjectName(selectedFile.name.replace('.zip', ''));
      }
    } else {
      setError('Please select a valid ZIP file');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !projectName.trim()) {
      setError('Project name and ZIP file are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('zipFile', file);
      formData.append('projectName', projectName);
      formData.append('description', description);

      const response = await apiClient.post('/projects/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Project Name"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        fullWidth
        required
        disabled={loading}
      />

      <TextField
        label="Description (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        multiline
        rows={2}
        disabled={loading}
      />

      <Paper
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: file ? '#f0f7ff' : 'transparent',
          borderColor: file ? '#1976d2' : '#ccc',
          '&:hover': {
            borderColor: '#1976d2',
            backgroundColor: '#f0f7ff'
          }
        }}
        component="label"
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          disabled={loading}
          style={{ display: 'none' }}
        />
        <CloudUploadIcon sx={{ fontSize: 40, color: file ? 'primary.main' : 'text.secondary', mb: 1 }} />
        <Typography variant="body1">
          {file ? `Selected: ${file.name}` : 'Click to select ZIP file'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Max 500 MB'}
        </Typography>
      </Paper>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={!file || !projectName.trim() || loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Upload Project'}
      </Button>
    </Box>
  );
}
