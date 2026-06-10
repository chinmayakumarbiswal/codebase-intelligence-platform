import { create } from 'zustand';

export const useAuthStore = create((set, get) => {
  return {
    user: null,
    token: null,
    isInitialized: false,
    isLoading: false,
    error: null,

    // Always read from localStorage and update state
    initializeAuth: () => {
      console.log('[initializeAuth] Reading from localStorage...');
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        console.log('[initializeAuth] localStorage contents:');
        console.log('  token:', token ? `${token.substring(0, 20)}...` : 'NULL');
        console.log('  userStr:', userStr ? 'EXISTS' : 'NULL');

        if (token && userStr) {
          const user = JSON.parse(userStr);
          console.log('[initializeAuth] ✓ Parsed user:', user.email);
          set({ 
            token,
            user,
            isInitialized: true,
          });
        } else {
          console.log('[initializeAuth] ✗ No valid auth in localStorage');
          set({ 
            token: null,
            user: null,
            isInitialized: true,
          });
        }
      } catch (err) {
        console.error('[initializeAuth] Error:', err);
        set({ 
          token: null,
          user: null,
          isInitialized: true,
        });
      }
    },

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false, error: error.message });
      }
    },

    logout: () => {
      console.log('[logout] Clearing auth');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, error: null, isInitialized: true });
    },

    setToken: (token, user) => {
      console.log('[setToken] Storing to localStorage:', { token: !!token, user: user?.email });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, error: null, isInitialized: true });
    },

    clearError: () => {
      set({ error: null });
    },
  };
});
