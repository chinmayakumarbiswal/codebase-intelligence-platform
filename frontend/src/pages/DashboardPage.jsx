import { Box, Button, Container, Typography, AppBar, Toolbar, Grid, Card, CardContent, CardActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import FolderIcon from '@mui/icons-material/Folder';
import ChatIcon from '@mui/icons-material/Chat';
import AnalyticsIcon from '@mui/icons-material/Analytics';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const features = [
    {
      icon: <FolderIcon sx={{ fontSize: 40 }} />,
      title: 'Projects',
      description: 'Upload ZIP files or clone Git repositories',
      action: () => navigate('/projects'),
      actionLabel: 'Manage Projects',
      status: '✅ Phase 2'
    },
    {
      icon: <ChatIcon sx={{ fontSize: 40 }} />,
      title: 'RAG Chat',
      description: 'Ask questions about your codebase with AI',
      action: () => alert('Coming in Phase 4'),
      actionLabel: 'Ask Question',
      status: '🔜 Phase 4',
      disabled: true
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 40 }} />,
      title: 'Code Analysis',
      description: 'Repository summaries, APIs, and dependencies',
      action: () => alert('Coming in Phase 5'),
      actionLabel: 'Analyze',
      status: '🔜 Phase 5',
      disabled: true
    }
  ];

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Codebase Intelligence Platform
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.fullName}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {user?.email}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {features.map((feature, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: feature.disabled ? 0.6 : 1,
                  cursor: feature.disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': !feature.disabled && {
                    boxShadow: 6,
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ color: feature.disabled ? 'text.disabled' : 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {feature.description}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>
                    {feature.status}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    size="small"
                    color="primary"
                    onClick={feature.action}
                    disabled={feature.disabled}
                    variant="outlined"
                  >
                    {feature.actionLabel}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
