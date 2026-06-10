import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ChatPage from './pages/ChatPage';
import EmbeddingsPage from './pages/EmbeddingsPage';
import PrivateRoute from './components/PrivateRoute';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  console.log('[App] Rendering App component');
  
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  console.log('[App] Store state:', { token: !!token, user: !!user, isInitialized });

  useEffect(() => {
    console.log('[App] useEffect - initializing auth');
    initializeAuth();
  }, [initializeAuth]);

  // Don't wait for anything, just render the Router
  // PrivateRoute will show loading spinner while checking auth
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<CallbackPage />} />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <ProjectsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <ProjectDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/chat"
            element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/embeddings"
            element={
              <PrivateRoute>
                <EmbeddingsPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/projects" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
