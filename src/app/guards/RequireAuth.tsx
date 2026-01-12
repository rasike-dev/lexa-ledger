import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { decodeJwt } from '../config/keycloak';

/**
 * RequireAuth Guard
 * 
 * Wraps protected routes and redirects to /login if user is not authenticated.
 * Also checks for expired tokens and clears stale auth state.
 * Preserves the attempted location for post-login redirect.
 */

function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return true;
  
  const nowSec = Math.floor(Date.now() / 1000);
  return decoded.exp <= nowSec;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // No token or not authenticated → redirect to login
  if (!accessToken || !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Token exists but is expired → redirect to login
  if (isTokenExpired(accessToken)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
