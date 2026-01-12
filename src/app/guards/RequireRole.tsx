import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { hasAnyRole, type Role } from "../../auth/roles";

type RequireRoleProps = {
  children: React.ReactNode;
  roles: Role[];
};

/**
 * Route guard that checks if the user has any of the required roles.
 * If not, redirects to /unauthorized.
 * 
 * Usage:
 * <Route path="/trading" element={
 *   <RequireRole roles={[Roles.TRADING_ANALYST, Roles.TENANT_ADMIN]}>
 *     <TradingPage />
 *   </RequireRole>
 * } />
 */
export function RequireRole({ children, roles }: RequireRoleProps) {
  const userRoles = useAuthStore((s) => s.roles);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // If not authenticated, let the auth guard handle it
  if (!isAuthenticated) {
    return null; // Auth guard will redirect to login
  }

  // Check if user has any of the required roles
  const hasRequiredRole = hasAnyRole(userRoles, roles);

  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
