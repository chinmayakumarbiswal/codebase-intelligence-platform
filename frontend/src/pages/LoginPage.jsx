import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);

  useEffect(() => {
    // Get OAuth login URL from backend
    const fetchAuthUrl = async () => {
      try {
        const response = await apiClient.get('/auth/login');
        setAuthUrl(response.data.url);
      } catch (err) {
        setError('Failed to initialize login');
      }
    };

    fetchAuthUrl();
  }, []);

  const handleGoogleLogin = () => {
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 3,
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          Codebase Intelligence Platform
        </Typography>

        <Typography variant="body1" color="textSecondary" textAlign="center">
          AI-powered code analysis and Q&A for your repositories
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          variant="contained"
          size="large"
          onClick={handleGoogleLogin}
          disabled={loading || !authUrl}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Logging in...' : 'Login with Google'}
        </Button>
      </Box>
    </Container>
  );
}
