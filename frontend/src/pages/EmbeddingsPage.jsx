import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import { apiClient } from '../services/apiClient';
import AppHeader from '../components/AppHeader';
import ChunkCard from '../components/ChunkCard';

/**
 * Page to view and search indexed embeddings/chunks
 */
export default function EmbeddingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [tabValue, setTabValue] = useState(0); // 0: Browse, 1: Search
  const [stats, setStats] = useState({
    totalChunks: 0,
    fileCount: 0,
  });

  // Load all chunks on mount
  useEffect(() => {
    fetchChunks();
  }, [projectId]);

  const fetchChunks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/chat/chunks/${projectId}?limit=500`);
      
      if (response.data.success) {
        setChunks(response.data.chunks || []);
        
        // Calculate stats
        const uniqueFiles = new Set(
          response.data.chunks.map(c => c.metadata?.source || 'unknown')
        );
        setStats({
          totalChunks: response.data.total || 0,
          fileCount: uniqueFiles.size,
        });
      } else {
        setError(response.data.message || 'Failed to load chunks');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load chunks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setSearching(true);
      setError(null);

      const response = await apiClient.post('/chat/search-chunks', {
        query: searchQuery,
        projectId,
        limit: 20,
      });

      if (response.data.success) {
        setSearchResults(response.data.chunks || []);
        setTabValue(1); // Switch to search results tab
      } else {
        setError(response.data.message || 'Search failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setTabValue(0);
  };

  if (loading) {
    return (
      <Box>
        <AppHeader />
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  const displayChunks = tabValue === 0 ? chunks : searchResults || [];

  return (
    <Box>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <StorageIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1">
                Embeddings & Search
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Explore indexed code chunks and search for similar patterns
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Chunks Indexed
                </Typography>
                <Typography variant="h5">
                  {stats.totalChunks.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Source Files
                </Typography>
                <Typography variant="h5">
                  {stats.fileCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Search Section */}
        <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f9f9f9' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon /> Semantic Search
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search for code chunks by describing what you're looking for
          </Typography>

          <form onSubmit={handleSearch}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="e.g., 'authentication middleware', 'database query', 'error handling'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searching}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!searchQuery.trim() || searching}
              >
                {searching ? <CircularProgress size={24} /> : 'Search'}
              </Button>
              {searchResults && (
                <Button
                  variant="outlined"
                  onClick={handleClearSearch}
                  disabled={searching}
                >
                  Clear
                </Button>
              )}
            </Box>
          </form>
        </Paper>

        {/* Tabs for Browse / Search Results */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            aria-label="chunk views"
          >
            <Tab label={`Browse All (${chunks.length})`} />
            <Tab
              label={`Search Results (${searchResults?.length || 0})`}
              disabled={!searchResults}
            />
          </Tabs>
        </Box>

        {/* Empty State */}
        {displayChunks.length === 0 && (
          <Alert severity="info">
            {tabValue === 0
              ? 'No chunks found. Start by indexing a project.'
              : 'No search results found. Try a different query.'}
          </Alert>
        )}

        {/* Chunks Display */}
        <Box>
          {displayChunks.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {displayChunks.length} chunk{displayChunks.length !== 1 ? 's' : ''}
              {tabValue === 1 && ` for "${searchQuery}"`}
            </Typography>
          )}

          {displayChunks.map((chunk, idx) => (
            <ChunkCard
              key={chunk.id || idx}
              chunk={chunk}
              index={idx}
              showScore={tabValue === 1}
              scoreLabel="Similarity"
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
