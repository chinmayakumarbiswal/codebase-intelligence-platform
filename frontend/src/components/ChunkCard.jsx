import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  Collapse,
  IconButton,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import { useState } from 'react';

/**
 * Component to display a single indexed code chunk
 */
export default function ChunkCard({
  chunk,
  index,
  showScore = false,
  scoreLabel = 'Distance',
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fileName = chunk.metadata?.source || 'unknown';
  const chunkIndex = chunk.metadata?.chunkIndex || 0;
  const timestamp = chunk.metadata?.timestamp 
    ? new Date(chunk.metadata.timestamp).toLocaleDateString()
    : 'unknown';

  return (
    <Card sx={{ mb: 2, transition: 'all 0.2s', '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {index + 1}. {fileName}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`Chunk #${chunkIndex}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={timestamp}
                size="small"
                variant="outlined"
              />
              {showScore && chunk.similarityScore !== undefined && (
                <Chip
                  label={`${scoreLabel}: ${(chunk.similarityScore * 100).toFixed(1)}%`}
                  size="small"
                  color={chunk.similarityScore > 0.7 ? 'success' : 'default'}
                />
              )}
              {showScore && chunk.distance !== undefined && (
                <Chip
                  label={`Distance: ${chunk.distance.toFixed(4)}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
          <Box>
            <IconButton
              onClick={handleCopyClick}
              size="small"
              title={copied ? 'Copied!' : 'Copy code'}
            >
              <FileCopyIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleExpandClick}
              size="small"
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Code Preview */}
        <Paper
          sx={{
            backgroundColor: '#f5f5f5',
            p: 1.5,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            overflow: 'auto',
            maxHeight: expanded ? 'auto' : 100,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            mb: 1,
          }}
        >
          {chunk.content ? chunk.content.substring(0, 500) : 'No content'}
          {chunk.content && chunk.content.length > 500 && !expanded && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
              ... (click expand to see full content)
            </Typography>
          )}
        </Paper>

        {/* Full Content (Expandable) */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Paper
            sx={{
              backgroundColor: '#fafafa',
              p: 1.5,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflow: 'auto',
              maxHeight: 400,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              mt: 1,
            }}
          >
            {chunk.content}
          </Paper>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Total characters: {chunk.content?.length || 0}
          </Typography>
        </Collapse>
      </CardContent>
    </Card>
  );
}
