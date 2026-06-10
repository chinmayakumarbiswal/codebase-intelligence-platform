import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../hooks/useAuth';

export default function CallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken } = useAuthStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error from backend
        const errorParam = searchParams.get('error');
        if (errorParam) {
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        // Extract token and user info from URL params (backend redirect)
        const token = searchParams.get('token');
        const userId = searchParams.get('userId');
        const email = searchParams.get('email');
        const fullName = searchParams.get('fullName');

        if (!token || !userId) {
          setError('No authentication token received');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        // Store token and user in auth store
        setToken(token, {
          id: userId,
          email: email || '',
          fullName: fullName || '',
          avatarUrl: '',
        });

        // Redirect to projects
        setTimeout(() => navigate('/projects', { replace: true }), 500);
      } catch (err) {
        setError(err.message || 'Authentication failed');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setToken]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      {error ? (
        <>
          <Alert severity="error">{error}</Alert>
          <Typography>Redirecting to login...</Typography>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography>Authenticating...</Typography>
        </>
      )}
    </Box>
  );
}
