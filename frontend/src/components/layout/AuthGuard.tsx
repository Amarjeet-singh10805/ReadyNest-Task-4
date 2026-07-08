import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useEffect } from 'react';
import { initSocket } from '@/lib/socket';
import api from '@/lib/api';
import { useNotificationStore } from '@/store/notifications';
import { useThemeStore } from '@/store/theme';

export function AuthGuard() {
  const { isAuthenticated, accessToken, refreshToken, setAuth, logout, user } = useAuthStore();
  const { setNotifications } = useNotificationStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    // Apply persisted theme on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    // Try to restore session via refresh token
    const restoreSession = async () => {
      if (!accessToken && refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          const meRes = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          });
          setAuth(meRes.data, data.accessToken, refreshToken);
        } catch {
          logout();
        }
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      initSocket(accessToken);
      // Load notifications
      api.get('/notifications')
        .then(({ data }) => setNotifications(data))
        .catch(() => {});
    }
  }, [isAuthenticated, accessToken]);

  if (!isAuthenticated && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  // Still loading — show spinner briefly
  if (!isAuthenticated && refreshToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <Outlet />;
}
