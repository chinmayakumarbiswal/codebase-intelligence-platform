import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

export default function PrivateRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  console.log('[PrivateRoute] Rendering:', { 
    token: !!token, 
    user: !!user, 
    isInitialized 
  });

  // If auth is initialized, make decision
  if (isInitialized) {
    if (token && user) {
      console.log('[PrivateRoute] ✓ Auth valid - rendering children');
      return <>{children}</>;
    } else {
      console.log('[PrivateRoute] ✗ No auth - redirecting to login');
      return <Navigate to="/login" replace />;
    }
  }

  // Auth not initialized yet - initialize and show loading
  console.log('[PrivateRoute] Not initialized - initializing auth');
  initializeAuth();
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
