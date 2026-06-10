import React, { useState, useEffect } from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import { apiClient } from '../services/apiClient';

/**
 * Component to display real-time indexing progress
 * Polls the progress endpoint and shows a progress bar
 */
export default function IndexingProgress({ projectId, onComplete, autoClose = true }) {
  const [progress, setProgress] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    const pollProgress = async () => {
      try {
        const response = await apiClient.get(`/chat/progress/${projectId}`);
        const data = response.data;

        setProgress(data);
        setError(null);

        // Check if indexing is complete
        if (data.percent === 100 || data.status === 'completed') {
          setIsComplete(true);
          if (onComplete) {
            onComplete(data);
          }
          return; // Stop polling
        }

        // Continue polling
        if (!autoClose || data.status === 'indexing') {
          setTimeout(pollProgress, 500); // Poll every 500ms
        }
      } catch (err) {
        console.error('Error polling progress:', err);
        setError(err.response?.data?.error || 'Failed to fetch progress');
        // Retry on error
        setTimeout(pollProgress, 1000);
      }
    };

    pollProgress();
  }, [projectId, onComplete, autoClose]);

  if (!progress) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            Initializing indexing...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              📊 Indexing Project
            </Typography>
            <Chip
              label={`${progress.percent}%`}
              size="small"
              color={progress.percent === 100 ? 'success' : 'primary'}
              variant="outlined"
            />
          </Box>

          <Box>
            <LinearProgress
              variant="determinate"
              value={progress.percent}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: progress.percent === 100 ? '#4caf50' : '#2196f3',
                },
              }}
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ fontSize: '0.875rem' }}>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Files: {progress.fileCount}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Chunks: {progress.embeddedChunks} / {progress.chunkCount}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Typography
                variant="caption"
                sx={{
                  color: progress.percent === 100 ? '#4caf50' : '#666',
                  fontWeight: progress.percent === 100 ? 600 : 400,
                }}
              >
                {progress.status === 'completed' ? '✅ Complete!' : '⏳ Indexing...'}
              </Typography>
            </Box>
          </Stack>

          {error && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          {progress.updatedAt && (
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              Updated: {new Date(progress.updatedAt).toLocaleTimeString()}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
